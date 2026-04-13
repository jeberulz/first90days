"use node";

/**
 * KB retrieval helper — the SINGLE entry point every AI surface uses to pull
 * relevant knowledge for a user. Centralizes the rag.search call, doc joins,
 * memory pulls, and prompt-block formatting so retrieval logic doesn't drift
 * across convex/ai.js, future agent tools, etc.
 *
 * Public functions are async helpers (not Convex actions) — they're called
 * directly from other "use node" actions, taking an `ActionCtx` argument.
 *
 * Boundary: this file owns the rag instance. No other file should call
 * rag.add / rag.search directly except convex/kbPipeline.js (which owns
 * ingestion).
 */

import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";
import { components, internal } from "../_generated/api.js";
import {
  formatContextBlock,
  estimateTokens,
} from "./kbPrompts.js";
import { EMBEDDING_DIMENSION } from "./ai.js";

// Single shared RAG instance. Module-level so it's reused across calls.
// Filter names must match the keys passed to rag.add in kbPipeline.runEmbed.
export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: EMBEDDING_DIMENSION,
  filterNames: ["category", "sourceType", "stakeholderId"],
});

/**
 * Build the per-user RAG namespace. Per-user isolation is structurally
 * enforced here — every search uses this. Memory consolidation uses a
 * sibling namespace `${userId}:memories`.
 */
export function userNamespace(userId) {
  return `user:${userId}`;
}

export function memoryNamespace(userId) {
  return `user:${userId}:memories`;
}

/**
 * Retrieve KB context for a planning / generation surface.
 *
 * @param {ActionCtx} ctx
 * @param {Object} args
 * @param {Id<"users">} args.userId
 * @param {string} args.query
 * @param {string[]} [args.categories] - filter slugs; if omitted, all
 * @param {number} [args.topK=12]
 * @param {boolean} [args.includeMemories=true]
 * @param {string} [args.memoryEntityType]
 * @param {string} [args.memoryEntityId]
 * @returns {Promise<{contextText: string, citations: Array, memories: Array, tokensEstimate: number}>}
 */
export async function fetchContextForPlanning(ctx, args) {
  const {
    userId,
    query,
    categories,
    topK = 12,
    includeMemories = true,
    memoryEntityType,
    memoryEntityId,
  } = args;

  if (!userId || !query || !query.trim()) {
    return {
      contextText: "",
      citations: [],
      memories: [],
      tokensEstimate: 0,
    };
  }

  // 1. Vector search via RAG. Categories filter is optional.
  let searchResult;
  try {
    searchResult = await rag.search(ctx, {
      namespace: userNamespace(userId),
      query,
      limit: topK,
      vectorScoreThreshold: 0.3,
      ...(categories && categories.length > 0
        ? {
            // RAG accepts a single filter or an array (OR semantics).
            filters: categories.map((c) => ({ name: "category", value: c })),
          }
        : {}),
    });
  } catch (err) {
    // First-run users have no namespace yet — that's fine, return empty.
    console.warn("[kbContext] rag.search failed", err?.message);
    return {
      contextText: "",
      citations: [],
      memories: [],
      tokensEstimate: 0,
    };
  }

  // 2. Join chunks back to kbDocuments rows for title / summary / keyFacts.
  // The rag entries[] each carry an `entryId` (RAG's internal id). We stored
  // the kbDocument id as `key` when adding, so the entry's `key` round-trips.
  const documentIds = [];
  const seen = new Set();
  for (const e of searchResult.entries || []) {
    if (e.key && !seen.has(e.key)) {
      seen.add(e.key);
      documentIds.push(e.key);
    }
  }
  let docsById = {};
  if (documentIds.length > 0) {
    const docs = await ctx.runQuery(
      internal.kbInternal.getDocumentsByIdsInternal,
      { documentIds }
    );
    docsById = Object.fromEntries(docs.map((d) => [d._id, d]));
  }

  const citations = (searchResult.entries || []).map((e) => {
    const doc = e.key ? docsById[e.key] : null;
    return {
      documentId: doc?._id ?? null,
      ragEntryId: e.entryId ?? null,
      title: doc?.title ?? e.title ?? "(untitled)",
      sourceType: doc?.sourceType ?? "unknown",
      category: doc?.category ?? null,
      summary: doc?.summary ?? null,
      keyFacts: doc?.keyFacts ?? null,
      snippet: doc?.content?.slice(0, 280) ?? null,
      score: e.score ?? null,
    };
  });

  // 3. Memories. If entity scoping is provided, narrow to that entity.
  let memories = [];
  if (includeMemories) {
    if (memoryEntityType && memoryEntityId) {
      const entityMemories = await ctx.runQuery(
        internal.kbInternal.getActiveMemoriesForEntityInternal,
        {
          userId,
          entityType: memoryEntityType,
          entityId: memoryEntityId,
        }
      );
      memories = entityMemories.filter((m) => m.status === "active");
    } else {
      memories = await ctx.runQuery(
        internal.kbInternal.getVisibleMemoriesInternal,
        { userId, limit: 8 }
      );
    }
    // Sort by confidence desc, cap to 8
    memories.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    memories = memories.slice(0, 8);
  }

  // 4. Format the prompt block
  const contextText = formatContextBlock({
    memories: memories.map((m) => ({
      text: m.text,
      type: m.type,
      confidence: m.confidence,
    })),
    entries: citations,
  });

  return {
    contextText,
    citations,
    memories,
    tokensEstimate: estimateTokens(contextText),
  };
}

/**
 * Raw semantic search — used by the Cmd+K modal. Returns matches without
 * formatting. No memory injection.
 */
export async function semanticSearch(ctx, args) {
  const { userId, query, limit = 10, categories } = args;
  if (!userId || !query || !query.trim()) {
    return { results: [], entries: [] };
  }
  try {
    const result = await rag.search(ctx, {
      namespace: userNamespace(userId),
      query,
      limit,
      vectorScoreThreshold: 0.2,
      ...(categories && categories.length > 0
        ? { filters: categories.map((c) => ({ name: "category", value: c })) }
        : {}),
    });

    const documentIds = [];
    const seen = new Set();
    for (const e of result.entries || []) {
      if (e.key && !seen.has(e.key)) {
        seen.add(e.key);
        documentIds.push(e.key);
      }
    }
    let docsById = {};
    if (documentIds.length > 0) {
      const docs = await ctx.runQuery(
        internal.kbInternal.getDocumentsByIdsInternal,
        { documentIds }
      );
      docsById = Object.fromEntries(docs.map((d) => [d._id, d]));
    }

    const matches = (result.entries || []).map((e) => {
      const doc = e.key ? docsById[e.key] : null;
      return {
        documentId: doc?._id ?? null,
        title: doc?.title ?? e.title ?? "(untitled)",
        category: doc?.category ?? null,
        sourceType: doc?.sourceType ?? null,
        summary: doc?.summary ?? null,
        snippet: doc?.content?.slice(0, 240) ?? null,
        score: e.score ?? null,
      };
    });

    return { matches, raw: result };
  } catch (err) {
    console.warn("[kbContext] semanticSearch failed", err?.message);
    return { matches: [], raw: null };
  }
}

/**
 * Audit log: record that a feature pulled KB context. Used by the activity
 * log so users can see how their brain is being used.
 */
export async function recordRetrieval(ctx, args) {
  await ctx.runMutation(internal.kb.recordRetrievalInternal, {
    userId: args.userId,
    feature: args.feature,
    documentIds: args.documentIds ?? [],
    memoryIds: args.memoryIds ?? [],
  });
}
