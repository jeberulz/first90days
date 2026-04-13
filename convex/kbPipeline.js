"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { Workpool } from "@convex-dev/workpool";
import { rag, userNamespace, memoryNamespace } from "./lib/kbContext.js";
import { generateText } from "./lib/ai.js";
import {
  ENRICHMENT_SYSTEM_PROMPT,
  enrichmentUserPrompt,
} from "./lib/kbPrompts.js";
import { embedText } from "./lib/ai.js";
import { chunkDocument } from "./lib/kbChunker.js";
import { resolveUserTimezone, tzTodayYmd } from "./lib/planDates.js";
import { computeQuotaState } from "./lib/billing.js";

/**
 * KB ingestion + enrichment pipeline.
 *
 * `run` is the orchestrator entry point. It dispatches embed and enrich into
 * separate workpools so slow enrichment can never starve fast embedding.
 *
 * Two pools are required because:
 *  - embed work: ~1s, mostly network. Higher concurrency (8) is fine.
 *  - enrich work: 5-15s of LLM time. Bound to 2 to keep daily cost sane.
 */

const embedPool = new Workpool(components.embedPool, { maxParallelism: 8 });
const enrichPool = new Workpool(components.enrichPool, { maxParallelism: 2 });
// Extraction is CPU-bound (pdf-parse parses page geometry in-process).
// Low parallelism bounds worst-case CPU on adversarial uploads and keeps a
// single user's bulk upload from starving interactive users.
const extractPool = new Workpool(components.extractPool, {
  maxParallelism: 2,
});

// ---------- Orchestrator ----------

export const run = internalAction({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.runQuery(internal.kbInternal.getDocumentInternal, {
      documentId,
    });
    if (!doc) {
      console.warn(`[kbPipeline.run] document ${documentId} not found`);
      return;
    }

    // 0. Extraction step (M0). If the doc is backed by an uploaded file
    //    and still has ingestionStatus "pending", we need to pull text
    //    out of the file before embed/enrich have anything to work with.
    //    runExtract re-kicks this same action when it's done.
    if (doc.storageId && doc.ingestionStatus === "pending") {
      await extractPool.enqueueAction(
        ctx,
        internal.kbExtract.runExtract,
        { documentId },
        { retry: true }
      );
      return;
    }

    // If extraction failed upstream, don't waste cycles trying to embed
    // empty content — the failure is already surfaced on the doc.
    if (doc.ingestionStatus === "failed") {
      return;
    }

    // 1. Embedding step (always — runEmbed handles its own dedup via contentHash)
    await embedPool.enqueueAction(
      ctx,
      internal.kbPipeline.runEmbed,
      { documentId },
      { retry: true }
    );

    // 2. Enrichment step. Skip very short content to save tokens.
    if ((doc.content || "").length >= 200) {
      await enrichPool.enqueueAction(
        ctx,
        internal.kbPipeline.runEnrich,
        { documentId },
        { retry: true }
      );
    } else {
      // Mark enrichment as skipped so the doc's status is coherent
      await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
        documentId,
        enrichmentStatus: "skipped",
      });
      const enrichJob = await ctx.runQuery(
        internal.kbInternal.findJobInternal,
        { documentId, kind: "enrich" }
      );
      if (enrichJob) {
        await ctx.runMutation(internal.kbInternal.markJobFinished, {
          jobId: enrichJob._id,
          status: "done",
        });
      }
    }
  },
});

// ---------- Embed ----------

export const runEmbed = internalAction({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, { documentId }) => {
    const job = await ctx.runQuery(internal.kbInternal.findJobInternal, {
      documentId,
      kind: "embed",
    });
    if (job) {
      await ctx.runMutation(internal.kbInternal.markJobStarted, {
        jobId: job._id,
      });
    }

    await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
      documentId,
      embeddingStatus: "running",
    });

    try {
      const doc = await ctx.runQuery(
        internal.kbInternal.getDocumentInternal,
        { documentId }
      );
      if (!doc) throw new Error(`document ${documentId} not found`);

      // Skip if content hasn't changed since last successful embed
      if (doc.lastEmbeddedHash && doc.lastEmbeddedHash === doc.contentHash) {
        await ctx.runMutation(
          internal.kbInternal.patchDocumentPipelineState,
          {
            documentId,
            embeddingStatus: "skipped",
          }
        );
        if (job) {
          await ctx.runMutation(internal.kbInternal.markJobFinished, {
            jobId: job._id,
            status: "done",
          });
        }
        return;
      }

      // Resolve stakeholder filter value (denormalized for filter speed)
      let stakeholderId = "none";
      if (doc.entityLinks && Array.isArray(doc.entityLinks)) {
        const link = doc.entityLinks.find((l) => l.type === "stakeholder");
        if (link) stakeholderId = link.id;
      }

      // Chunk the document text (heading-aware recursive chunker). Short
      // docs return a single chunk; long docs return N with overlap.
      const chunks = chunkDocument({ content: doc.content });
      if (chunks.length === 0) {
        // Nothing to embed — record as done and move on.
        await ctx.runMutation(
          internal.kbInternal.patchDocumentPipelineState,
          {
            documentId,
            embeddingStatus: "skipped",
            lastEmbeddedHash: doc.contentHash,
          }
        );
        if (job) {
          await ctx.runMutation(internal.kbInternal.markJobFinished, {
            jobId: job._id,
            status: "done",
          });
        }
        return;
      }

      // Feed the chunks to the RAG component. Using the `chunks` option
      // (instead of `text`) lets us keep chunk boundaries + heading context
      // aligned with the kbChunks mirror we persist below. Re-using `key`
      // causes RAG to replace the existing entry transactionally on
      // re-embed.
      const result = await rag.add(ctx, {
        namespace: userNamespace(doc.userId),
        key: doc._id,
        title: doc.title,
        filterValues: [
          { name: "category", value: doc.category },
          { name: "sourceType", value: doc.sourceType },
          { name: "stakeholderId", value: stakeholderId },
        ],
        chunks: chunks.map((c) => ({
          text: c.text,
          metadata: {
            chunkIndex: c.chunkIndex,
            // headingPath is stored as a joined string because RAG metadata
            // values are arbitrary but we want a single stable representation.
            headingPath: (c.headingPath ?? []).join(" › "),
          },
        })),
      });

      // Mirror the chunks into our own table. This MUST happen after the
      // rag.add call succeeds — otherwise a failed embed would leave stale
      // chunks pointing at an entry that no longer exists.
      await ctx.runMutation(
        internal.kbInternal.replaceChunksForDocument,
        {
          userId: doc.userId,
          documentId,
          chunks: chunks.map((c) => ({
            chunkIndex: c.chunkIndex,
            text: c.text,
            charStart: c.charStart,
            charEnd: c.charEnd,
            contentHash: c.contentHash,
            headingPath: c.headingPath ?? [],
            tokenEstimate: c.tokenEstimate,
          })),
        }
      );

      await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
        documentId,
        embeddingStatus: "done",
        ragEntryId: result.entryId,
        lastEmbeddedHash: doc.contentHash,
      });
      if (job) {
        await ctx.runMutation(internal.kbInternal.markJobFinished, {
          jobId: job._id,
          status: "done",
        });
      }
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.error(`[kbPipeline.runEmbed] ${documentId}: ${msg}`);
      await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
        documentId,
        embeddingStatus: "failed",
        lastError: msg,
      });
      if (job) {
        await ctx.runMutation(internal.kbInternal.markJobFinished, {
          jobId: job._id,
          status: "failed",
          error: msg,
        });
      }
      throw err; // let workpool retry
    }
  },
});

// ---------- Enrich ----------

const VALID_CATEGORIES = new Set([
  "company_context",
  "team_people",
  "product_technology",
  "processes_workflows",
  "goals_notes",
  "industry_market",
]);
const VALID_MEMORY_TYPES = new Set([
  "behavioral",
  "people",
  "technical",
  "goal",
  "process",
  "cultural",
]);
const VALID_ENTITY_TYPES = new Set([
  "stakeholder",
  "goal",
  "company",
  "team",
  "product",
  "none",
]);

function safeParseEnrichment(raw) {
  if (!raw) return null;
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    /* fall through */
  }
  // Try extracting first {...} block
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      /* fall through */
    }
  }
  return null;
}

export const runEnrich = internalAction({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, { documentId }) => {
    const job = await ctx.runQuery(internal.kbInternal.findJobInternal, {
      documentId,
      kind: "enrich",
    });
    if (job) {
      await ctx.runMutation(internal.kbInternal.markJobStarted, {
        jobId: job._id,
      });
    }

    await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
      documentId,
      enrichmentStatus: "running",
    });

    try {
      const doc = await ctx.runQuery(
        internal.kbInternal.getDocumentInternal,
        { documentId }
      );
      if (!doc) throw new Error(`document ${documentId} not found`);

      // Check user's enrichment-enabled flag
      const settings = await ctx.runQuery(
        internal.kbInternal.getUserSettingsInternal,
        { userId: doc.userId }
      );
      const enrichmentEnabled = settings?.kb?.enrichmentEnabled !== false;
      if (!enrichmentEnabled) {
        await ctx.runMutation(
          internal.kbInternal.patchDocumentEnrichment,
          {
            documentId,
            enrichmentStatus: "skipped",
          }
        );
        if (job) {
          await ctx.runMutation(internal.kbInternal.markJobFinished, {
            jobId: job._id,
            status: "done",
          });
        }
        return;
      }

      // Billing quota gate. Free tier is capped at 5 enrichments/day;
      // Pro and pro_legacy at 100. Counter resets at local midnight in the
      // user's timezone.
      const { tier } = await ctx.runQuery(
        internal.billing.getTierInternal,
        { userId: doc.userId }
      );
      const tz = resolveUserTimezone({ settings });
      const todayYmd = tzTodayYmd(tz);
      const quota = computeQuotaState({
        tier,
        kbSettings: settings?.kb,
        todayYmd,
      });

      if (quota.overCap) {
        await ctx.runMutation(
          internal.kbInternal.patchDocumentEnrichment,
          {
            documentId,
            enrichmentStatus: "skipped",
          }
        );
        if (job) {
          await ctx.runMutation(internal.kbInternal.markJobFinished, {
            jobId: job._id,
            status: "done",
          });
        }
        return;
      }

      if (quota.resetNeeded) {
        await ctx.runMutation(
          internal.kbInternal.resetEnrichmentBudget,
          { userId: doc.userId, date: todayYmd }
        );
      }

      // Generate the enrichment JSON
      const userPrompt = enrichmentUserPrompt(doc);
      const raw = await generateText(ENRICHMENT_SYSTEM_PROMPT, userPrompt);
      const parsed = safeParseEnrichment(raw);

      if (!parsed) {
        throw new Error("Enrichment response did not contain valid JSON");
      }

      // Validate + sanitize
      const summary = typeof parsed.summary === "string" ? parsed.summary : undefined;
      const keyFacts = Array.isArray(parsed.keyFacts)
        ? parsed.keyFacts
            .filter((f) => typeof f === "string" && f.trim())
            .slice(0, 7)
        : undefined;
      const importance = Number.isFinite(parsed.importance)
        ? Math.max(0, Math.min(100, Math.round(parsed.importance)))
        : undefined;

      let categoryUpdate;
      let categoryConfidenceUpdate;
      if (
        typeof parsed.categoryPrediction === "string" &&
        VALID_CATEGORIES.has(parsed.categoryPrediction) &&
        Number.isFinite(parsed.categoryConfidence) &&
        parsed.categoryConfidence > 0.7 &&
        // Don't overwrite a user-set category (categoryConfidence === 1 means user)
        (doc.categoryConfidence === undefined || doc.categoryConfidence < 1)
      ) {
        categoryUpdate = parsed.categoryPrediction;
        categoryConfidenceUpdate = Math.min(
          1,
          Math.max(0, parsed.categoryConfidence)
        );
      }

      // Patch the document with enrichment outputs
      await ctx.runMutation(internal.kbInternal.patchDocumentEnrichment, {
        documentId,
        summary,
        keyFacts,
        importance,
        category: categoryUpdate,
        categoryConfidence: categoryConfidenceUpdate,
        type: "ai_enriched",
        enrichmentStatus: "done",
      });

      // Count this successful enrichment toward the user's daily budget.
      // Done after the document patch so failures upstream don't consume quota.
      await ctx.runMutation(
        internal.kbInternal.incrementEnrichmentBudget,
        { userId: doc.userId }
      );

      // Insert memory candidates (if any)
      const candidates = Array.isArray(parsed.memoryCandidates)
        ? parsed.memoryCandidates
        : [];
      const newMemoryIds = [];
      for (const c of candidates.slice(0, 8)) {
        if (!c || typeof c.text !== "string" || !c.text.trim()) continue;
        const type = VALID_MEMORY_TYPES.has(c.type) ? c.type : "behavioral";
        const confidence = Number.isFinite(c.confidence)
          ? Math.max(0, Math.min(1, c.confidence))
          : 0.5;
        let entityType = VALID_ENTITY_TYPES.has(c.entityType)
          ? c.entityType
          : "none";
        let entityId;

        // Resolve stakeholder by name (case-insensitive exact)
        if (entityType === "stakeholder" && c.entityName) {
          const resolved = await ctx.runQuery(
            internal.kb.findStakeholderByNameInternal,
            { userId: doc.userId, name: c.entityName }
          );
          if (resolved) entityId = resolved._id;
          else entityType = "none";
        } else if (entityType === "company") {
          entityId = "company";
        } else if (entityType === "team") {
          entityId = "team";
        } else if (entityType === "product") {
          entityId = "product";
        }

        const memoryId = await ctx.runMutation(
          internal.kbInternal.insertMemoryCandidate,
          {
            userId: doc.userId,
            text: c.text,
            type,
            confidence,
            entityType,
            entityId,
            sourceDocumentIds: [documentId],
            extractedBy: "claude",
          }
        );
        newMemoryIds.push(memoryId);
      }

      if (job) {
        await ctx.runMutation(internal.kbInternal.markJobFinished, {
          jobId: job._id,
          status: "done",
        });
      }

      // Schedule consolidation (M2 — finalizes new memories)
      if (newMemoryIds.length > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.kbPipeline.consolidateMemories,
          { userId: doc.userId, newMemoryIds }
        );
      }
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.error(`[kbPipeline.runEnrich] ${documentId}: ${msg}`);
      await ctx.runMutation(internal.kbInternal.patchDocumentEnrichment, {
        documentId,
        enrichmentStatus: "failed",
      });
      await ctx.runMutation(internal.kbInternal.patchDocumentPipelineState, {
        documentId,
        lastError: msg,
      });
      if (job) {
        await ctx.runMutation(internal.kbInternal.markJobFinished, {
          jobId: job._id,
          status: "failed",
          error: msg,
        });
      }
      throw err;
    }
  },
});

// ---------- Memory consolidation ----------

export const consolidateMemories = internalAction({
  args: {
    userId: v.id("users"),
    newMemoryIds: v.array(v.id("kbMemories")),
  },
  handler: async (ctx, { userId, newMemoryIds }) => {
    for (const newId of newMemoryIds) {
      const candidate = await ctx.runQuery(
        internal.kb.getMemoryByIdInternal,
        { memoryId: newId }
      );
      if (!candidate || candidate.status !== "candidate") continue;

      // 1. Exact-text dedup against active memories of same entity + type
      let active = [];
      if (candidate.entityType && candidate.entityId) {
        active = await ctx.runQuery(
          internal.kbInternal.getActiveMemoriesForEntityInternal,
          {
            userId,
            entityType: candidate.entityType,
            entityId: candidate.entityId,
          }
        );
        active = active.filter(
          (m) => m.status === "active" && m.type === candidate.type
        );
      }

      const exactMatch = active.find(
        (m) => m.text.trim().toLowerCase() === candidate.text.trim().toLowerCase()
      );

      if (exactMatch) {
        if ((exactMatch.confidence ?? 0) >= (candidate.confidence ?? 0)) {
          // Existing is at least as confident — dismiss the new candidate
          await ctx.runMutation(internal.kbInternal.supersedeMemory, {
            memoryId: newId,
            supersededBy: exactMatch._id,
          });
          continue;
        } else {
          // New is more confident — supersede the existing one
          await ctx.runMutation(internal.kbInternal.supersedeMemory, {
            memoryId: exactMatch._id,
            supersededBy: newId,
          });
        }
      }

      // 2. Semantic similarity check (best-effort; skip on error)
      try {
        const candidateEmbedding = await embedText(candidate.text);
        const memNs = memoryNamespace(userId);
        const similar = await rag.search(ctx, {
          namespace: memNs,
          query: candidateEmbedding,
          limit: 5,
          vectorScoreThreshold: 0.85,
        });
        // For now we don't auto-supersede on semantic similarity — too noisy.
        // Just log if there's a strong match for future tuning.
        if (similar.entries && similar.entries.length > 0) {
          console.log(
            `[consolidateMemories] candidate ${newId} has ${similar.entries.length} semantically similar memories`
          );
        }

        // Add this memory to the memory namespace for future similarity
        await rag.add(ctx, {
          namespace: memNs,
          key: newId,
          text: candidate.text,
        });
      } catch (err) {
        console.warn(
          `[consolidateMemories] semantic check failed: ${err?.message}`
        );
      }

      // 3. Promote to active
      await ctx.runMutation(internal.kbInternal.promoteMemoryToActive, {
        memoryId: newId,
      });
    }
  },
});
