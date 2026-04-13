import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * One-shot backfill: re-index every existing kbDocument under the new
 * chunk-level pipeline (Priority 1).
 *
 * Before Priority 1 shipped, we keyed one RAG entry per document with a
 * single chunk (the whole doc) and had no kbChunks mirror. After Priority
 * 1 we key one RAG entry per document with multiple chunks PLUS a kbChunks
 * row per chunk. Existing documents stayed on the old shape, so until this
 * backfill runs:
 *   - retrieval sees one chunk per doc (no heading path, no per-section
 *     targeting)
 *   - the UI "indexed into N chunks" count is missing
 *
 * Strategy: for each kbDocument, clear `lastEmbeddedHash` so runEmbed
 * re-computes chunks from scratch, delete any stale kbChunks rows, then
 * re-kick internal.kbPipeline.run which handles the rest (including RAG
 * entry replacement via shared key).
 *
 * The pipeline queue handles the actual embed cost — this action only
 * scans and enqueues.
 *
 * Trigger after deploy:
 *   npx convex run migrations/backfillChunks:backfillAll
 *
 * Check progress:
 *   npx convex run migrations/backfillChunks:status
 *
 * If you only want a specific user (e.g. during a staging test):
 *   npx convex run migrations/backfillChunks:backfillForUser '{"userId":"..."}'
 */

const SCAN_BATCH_SIZE = 500;

export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("kbDocuments").take(SCAN_BATCH_SIZE * 10);
    let total = 0;
    let chunked = 0;
    let unchunked = 0;
    let pending = 0;
    for (const d of docs) {
      total++;
      if (d.ingestionStatus === "pending" || d.ingestionStatus === "extracting") {
        pending++;
      } else if ((d.chunkCount ?? 0) > 0) {
        chunked++;
      } else {
        unchunked++;
      }
    }
    return { total, chunked, unchunked, pending };
  },
});

/**
 * Mark a single document as needing re-embed. Clears lastEmbeddedHash so
 * the runEmbed dedup check doesn't skip it, wipes any prior kbChunks rows
 * (they'll be replaced by runEmbed), and re-schedules the pipeline.
 */
export const resetDocumentForBackfill = internalMutation({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return false;
    // Skip docs that haven't finished extraction — kbPipeline.run will
    // handle them when the extractor completes.
    if (doc.ingestionStatus === "pending" || doc.ingestionStatus === "extracting") {
      return false;
    }
    // Clear chunk-related state so runEmbed re-runs.
    await ctx.db.patch(documentId, {
      lastEmbeddedHash: undefined,
      chunkCount: undefined,
      embeddingStatus: "pending",
    });
    // Wipe kbChunks; runEmbed will re-populate.
    const existing = await ctx.db
      .query("kbChunks")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    // Re-queue the pipeline.
    await ctx.scheduler.runAfter(0, internal.kbPipeline.run, { documentId });
    return true;
  },
});

/**
 * Walk ALL kbDocuments and schedule a re-embed for each. Safe to re-run:
 * runEmbed is idempotent via content hash, and replacing a RAG entry by
 * key is a transactional operation in the RAG component.
 */
export const backfillAll = internalAction({
  args: {},
  handler: async (ctx) => {
    let processed = 0;
    let scheduled = 0;
    let skipped = 0;

    const ids = await ctx.runQuery(internal.migrations.backfillChunks.listAllDocumentIds, {});
    for (const documentId of ids) {
      processed++;
      const ok = await ctx.runMutation(
        internal.migrations.backfillChunks.resetDocumentForBackfill,
        { documentId }
      );
      if (ok) scheduled++;
      else skipped++;
    }
    return { processed, scheduled, skipped };
  },
});

/**
 * Backfill chunks for a single user. Same semantics as backfillAll but
 * scoped — used for staged rollout or for manual recovery when a single
 * user's brain got out of sync with the chunk table.
 */
export const backfillForUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    let scheduled = 0;
    let skipped = 0;
    const ids = await ctx.runQuery(
      internal.migrations.backfillChunks.listUserDocumentIds,
      { userId }
    );
    for (const documentId of ids) {
      const ok = await ctx.runMutation(
        internal.migrations.backfillChunks.resetDocumentForBackfill,
        { documentId }
      );
      if (ok) scheduled++;
      else skipped++;
    }
    return { scheduled, skipped };
  },
});

export const listAllDocumentIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    // v1 assumption: fewer than ~5000 docs across all users. If we outgrow
    // this we'll switch to paginated iteration.
    const docs = await ctx.db.query("kbDocuments").take(5000);
    return docs.map((d) => d._id);
  },
});

export const listUserDocumentIds = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const docs = await ctx.db
      .query("kbDocuments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(5000);
    return docs.map((d) => d._id);
  },
});
