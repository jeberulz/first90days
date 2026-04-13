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
import {
  CONTEXT_SIMILARITY_THRESHOLD_DEFAULT,
  SEARCH_SIMILARITY_THRESHOLD_DEFAULT,
  CONTEXT_TOP_K_DEFAULT,
  CONTEXT_OVERFETCH_MULTIPLIER,
  CHUNK_MAX_PER_DOC_IN_CONTEXT,
} from "./kbRetrievalConfig.js";
import { groupResultsByDocument } from "./kbRetrievalGrouping.js";

// Re-export so callers that previously imported from kbContext still work.
export { groupResultsByDocument };

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
    topK = CONTEXT_TOP_K_DEFAULT,
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
  //    We over-fetch by CONTEXT_OVERFETCH_MULTIPLIER so that when chunks
  //    get grouped back down to "top N-per-doc" we still end up with
  //    roughly `topK` distinct documents in the context block.
  let searchResult;
  try {
    searchResult = await rag.search(ctx, {
      namespace: userNamespace(userId),
      query,
      limit: topK * CONTEXT_OVERFETCH_MULTIPLIER,
      vectorScoreThreshold: CONTEXT_SIMILARITY_THRESHOLD_DEFAULT,
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

  // 2. Group RAG results back into per-document citations.
  //    Each SearchResult is a per-chunk hit (with entryId pointing to the
  //    RAG entry — which is our kbDocument). The entries[] array is
  //    deduplicated by entryId and carries the user-visible `key` (= our
  //    documentId). We want: for each document, its top N chunks by score,
  //    capped at CHUNK_MAX_PER_DOC_IN_CONTEXT.
  const citations = groupResultsByDocument({
    searchResult,
    maxPerDoc: CHUNK_MAX_PER_DOC_IN_CONTEXT,
    maxDocs: topK,
  });

  // 3. Join documents for metadata (title, summary, keyFacts, category).
  const documentIds = citations
    .map((c) => c.documentId)
    .filter((id) => id);
  let docsById = {};
  if (documentIds.length > 0) {
    const docs = await ctx.runQuery(
      internal.kbInternal.getDocumentsByIdsInternal,
      { documentIds }
    );
    docsById = Object.fromEntries(docs.map((d) => [d._id, d]));
  }

  // Hydrate citations with doc metadata + fallback snippet.
  for (const c of citations) {
    const doc = c.documentId ? docsById[c.documentId] : null;
    c.title = doc?.title ?? c.title ?? "(untitled)";
    c.sourceType = doc?.sourceType ?? "unknown";
    c.category = doc?.category ?? null;
    c.summary = doc?.summary ?? null;
    c.keyFacts = doc?.keyFacts ?? null;
    // Legacy snippet kept as fallback for pre-chunking docs until backfill.
    if (c.chunks.length === 0 && doc?.content) {
      c.chunks = [
        {
          text: doc.content.slice(0, 280),
          headingPath: [],
          score: null,
          chunkIndex: 0,
        },
      ];
    }
  }

  // 4. Memories. If entity scoping is provided, narrow to that entity.
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

  // 5. Format the prompt block
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
 * Raw semantic search — used by the Cmd+K modal. Returns per-doc matches
 * with top-chunk snippets. No memory injection.
 */
export async function semanticSearch(ctx, args) {
  const { userId, query, limit = 10, categories } = args;
  if (!userId || !query || !query.trim()) {
    return { matches: [], raw: null };
  }
  try {
    const result = await rag.search(ctx, {
      namespace: userNamespace(userId),
      query,
      limit: limit * CONTEXT_OVERFETCH_MULTIPLIER,
      vectorScoreThreshold: SEARCH_SIMILARITY_THRESHOLD_DEFAULT,
      ...(categories && categories.length > 0
        ? { filters: categories.map((c) => ({ name: "category", value: c })) }
        : {}),
    });

    const citations = groupResultsByDocument({
      searchResult: result,
      maxPerDoc: CHUNK_MAX_PER_DOC_IN_CONTEXT,
      maxDocs: limit,
    });

    const documentIds = citations.map((c) => c.documentId).filter(Boolean);
    let docsById = {};
    if (documentIds.length > 0) {
      const docs = await ctx.runQuery(
        internal.kbInternal.getDocumentsByIdsInternal,
        { documentIds }
      );
      docsById = Object.fromEntries(docs.map((d) => [d._id, d]));
    }

    const matches = citations.map((c) => {
      const doc = c.documentId ? docsById[c.documentId] : null;
      const topChunk = c.chunks[0];
      const snippet =
        topChunk?.text?.slice(0, 240) ??
        doc?.content?.slice(0, 240) ??
        null;
      return {
        documentId: doc?._id ?? null,
        title: doc?.title ?? "(untitled)",
        category: doc?.category ?? null,
        sourceType: doc?.sourceType ?? null,
        summary: doc?.summary ?? null,
        snippet,
        headingPath: topChunk?.headingPath ?? [],
        score: c.score ?? null,
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
