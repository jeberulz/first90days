import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { mapLegacyCategory } from "../lib/kbCategories.js";

/**
 * One-shot migration: copy every existing knowledgeEntries row into the new
 * kbDocuments table and queue the embedding/enrichment pipeline for each.
 *
 * Idempotency: insertDocument checks legacyKnowledgeEntryId via the
 * by_user_legacy index and skips if a doc already exists. Re-running the
 * migration is safe.
 *
 * Trigger after deploy:
 *   npx convex run migrations/legacyKnowledgeToDocuments:migrateAllUsers
 *
 * Check progress:
 *   npx convex run migrations/legacyKnowledgeToDocuments:status
 */

const BATCH_SIZE = 100;

export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    let legacyCount = 0;
    let migratedCount = 0;

    // Walk legacy table — bounded by take(); for very large datasets we'd
    // want pagination. v1 assumption: < few thousand rows total.
    const legacy = await ctx.db.query("knowledgeEntries").take(5000);
    legacyCount = legacy.length;

    for (const row of legacy) {
      const existing = await ctx.db
        .query("kbDocuments")
        .withIndex("by_user_legacy", (q) =>
          q.eq("userId", row.userId).eq("legacyKnowledgeEntryId", row._id)
        )
        .first();
      if (existing) migratedCount++;
    }

    return {
      legacyCount,
      migratedCount,
      pending: legacyCount - migratedCount,
    };
  },
});

/**
 * Migrate one batch of legacy rows for a single user. Schedules itself if
 * more rows remain, so each invocation stays under transaction limits.
 */
export const migrateOneUserBatch = internalMutation({
  args: {
    userId: v.id("users"),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, { userId, cursor }) => {
    const startIndex = cursor ?? 0;

    const allLegacy = await ctx.db
      .query("knowledgeEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const slice = allLegacy.slice(startIndex, startIndex + BATCH_SIZE);
    let inserted = 0;

    for (const row of slice) {
      // Idempotency check via the by_user_legacy index
      const existing = await ctx.db
        .query("kbDocuments")
        .withIndex("by_user_legacy", (q) =>
          q.eq("userId", userId).eq("legacyKnowledgeEntryId", row._id)
        )
        .first();
      if (existing) continue;

      await ctx.runMutation(internal.kbInternal.insertDocument, {
        userId,
        title: row.title,
        content: row.content,
        category: mapLegacyCategory(row.category),
        sourceType: "manual",
        type: "imported",
        legacyKnowledgeEntryId: row._id,
        // Skip pipeline scheduling here so we can stagger it from the action
        // (avoids slamming the workpool when many rows land at once).
        skipPipeline: true,
      });
      inserted++;
    }

    const moreInBatch = startIndex + BATCH_SIZE < allLegacy.length;
    return { inserted, moreInBatch, nextCursor: startIndex + BATCH_SIZE };
  },
});

/**
 * Get all distinct user ids that have at least one legacy entry.
 */
export const listUsersWithLegacyEntries = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("knowledgeEntries").take(5000);
    const seen = new Set();
    for (const r of rows) seen.add(r.userId);
    return Array.from(seen);
  },
});

/**
 * Get every kbDocument that was created by this migration but hasn't been
 * embedded yet. Used by the action to schedule pipeline runs with jitter.
 */
export const listMigratedPendingDocs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("kbDocuments").take(5000);
    return docs
      .filter(
        (d) =>
          d.legacyKnowledgeEntryId !== undefined &&
          d.embeddingStatus === "pending"
      )
      .map((d) => d._id);
  },
});

/**
 * Top-level migration entry point. Walks every user that has legacy entries,
 * migrates them in batches, then schedules pipeline runs with per-doc jitter
 * so the embedPool isn't slammed.
 */
export const migrateAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const userIds = await ctx.runQuery(
      internal.migrations.legacyKnowledgeToDocuments.listUsersWithLegacyEntries,
      {}
    );

    let totalInserted = 0;
    for (const userId of userIds) {
      let cursor = 0;
      // Run batches until none remain
      let more = true;
      while (more) {
        const result = await ctx.runMutation(
          internal.migrations.legacyKnowledgeToDocuments.migrateOneUserBatch,
          { userId, cursor }
        );
        totalInserted += result.inserted;
        if (!result.moreInBatch) {
          more = false;
        } else {
          cursor = result.nextCursor;
        }
      }
    }

    // Now schedule pipeline runs for every freshly migrated doc with jitter
    const pendingDocIds = await ctx.runQuery(
      internal.migrations.legacyKnowledgeToDocuments.listMigratedPendingDocs,
      {}
    );

    let i = 0;
    for (const documentId of pendingDocIds) {
      await ctx.scheduler.runAfter(
        i * 250,
        internal.kbPipeline.run,
        { documentId }
      );
      i++;
    }

    return {
      users: userIds.length,
      totalInserted,
      pipelineScheduled: pendingDocIds.length,
    };
  },
});
