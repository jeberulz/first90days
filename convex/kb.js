import { v } from "convex/values";
import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { KB_CATEGORY_SLUGS } from "./lib/kbCategories.js";

/**
 * Public API for the KB "brain". Auth is enforced at every public function
 * via auth.getUserId. Internal helpers live in convex/kbInternal.js and
 * are called only after ownership has been verified here.
 *
 * The semantic search action wraps convex/lib/kbContext.js — that module
 * is the single retrieval entry point for the entire app.
 */

const CATEGORY_VALIDATOR = v.union(
  v.literal("company_context"),
  v.literal("team_people"),
  v.literal("product_technology"),
  v.literal("processes_workflows"),
  v.literal("goals_notes"),
  v.literal("industry_market")
);

const SOURCE_TYPE_VALIDATOR = v.union(
  v.literal("manual"),
  v.literal("upload"),
  v.literal("reflection_autocapture"),
  v.literal("interaction_autocapture"),
  v.literal("activity_completion_autocapture"),
  v.literal("ai_generated")
);

// ---------- Mutations ----------

/**
 * Public entry point for creating a KB document. The mutation itself only
 * touches the database — embedding + enrichment happen in the background
 * pipeline, scheduled via internal.kbPipeline.run.
 */
export const createDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.optional(CATEGORY_VALIDATOR),
    sourceType: v.optional(SOURCE_TYPE_VALIDATOR),
    importance: v.optional(v.number()),
    relatedStakeholderId: v.optional(v.id("stakeholders")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entityLinks = args.relatedStakeholderId
      ? [{ type: "stakeholder", id: args.relatedStakeholderId }]
      : undefined;

    const documentId = await ctx.runMutation(
      internal.kbInternal.insertDocument,
      {
        userId,
        title: args.title,
        content: args.content,
        category: args.category,
        sourceType: args.sourceType ?? "manual",
        importance: args.importance,
        entityLinks,
      }
    );

    return documentId;
  },
});

export const updateDocument = mutation({
  args: {
    documentId: v.id("kbDocuments"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(CATEGORY_VALIDATOR),
    importance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.userId !== userId) throw new Error("Not found");

    const { documentId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    // If content changed, recompute hash and re-queue pipeline
    if (filtered.content && filtered.content !== doc.content) {
      // FNV hash — match kbInternal.computeContentHash semantics
      const text = filtered.content;
      let h = 0x811c9dc5;
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      filtered.contentHash = `fnv1a:${h.toString(16).padStart(8, "0")}:${text.length}`;
      filtered.embeddingStatus = "pending";
      filtered.enrichmentStatus = "pending";
    }

    // If category was set explicitly by the user, mark it as fully confident
    if (filtered.category) {
      filtered.categoryConfidence = 1.0;
    }

    await ctx.db.patch(documentId, filtered);

    // If we touched content, re-run the pipeline
    if (filtered.contentHash) {
      // Insert new pipeline jobs and reschedule
      await ctx.db.insert("kbEnrichmentJobs", {
        userId,
        documentId,
        kind: "embed",
        status: "queued",
        attempts: 0,
      });
      await ctx.db.insert("kbEnrichmentJobs", {
        userId,
        documentId,
        kind: "enrich",
        status: "queued",
        attempts: 0,
      });
      await ctx.scheduler.runAfter(0, internal.kbPipeline.run, { documentId });
    }
  },
});

export const archiveDocument = mutation({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.documentId, { archivedAt: Date.now() });
  },
});

export const dismissMemory = mutation({
  args: { memoryId: v.id("kbMemories") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.memoryId, {
      status: "dismissed",
      visibleInStream: false,
    });
  },
});

export const relinkMemory = mutation({
  args: {
    memoryId: v.id("kbMemories"),
    entityType: v.union(
      v.literal("stakeholder"),
      v.literal("goal"),
      v.literal("company"),
      v.literal("team"),
      v.literal("product"),
      v.literal("none")
    ),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.memoryId, {
      entityType: args.entityType,
      entityId: args.entityId,
    });
  },
});

// ---------- Queries (per-user, indexed) ----------

export const getDocument = query({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.userId !== userId) return null;
    return doc;
  },
});

export const listDocuments = query({
  args: {
    category: v.optional(CATEGORY_VALIDATOR),
    sourceType: v.optional(SOURCE_TYPE_VALIDATOR),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    let q;
    if (args.category) {
      q = ctx.db
        .query("kbDocuments")
        .withIndex("by_user_category", (qb) =>
          qb.eq("userId", userId).eq("category", args.category)
        );
    } else {
      q = ctx.db
        .query("kbDocuments")
        .withIndex("by_user", (qb) => qb.eq("userId", userId));
    }

    const results = await q.order("desc").take(args.limit ?? 200);
    return args.sourceType
      ? results.filter((d) => d.sourceType === args.sourceType && !d.archivedAt)
      : results.filter((d) => !d.archivedAt);
  },
});

export const recentDocuments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const docs = await ctx.db
      .query("kbDocuments")
      .withIndex("by_user", (qb) => qb.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 8);
    return docs.filter((d) => !d.archivedAt);
  },
});

export const categoryStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const stats = {};
    for (const slug of KB_CATEGORY_SLUGS) {
      stats[slug] = { count: 0, enriched: 0, running: 0 };
    }

    const docs = await ctx.db
      .query("kbDocuments")
      .withIndex("by_user", (qb) => qb.eq("userId", userId))
      .take(2000);
    for (const d of docs) {
      if (d.archivedAt) continue;
      const bucket = stats[d.category];
      if (!bucket) continue;
      bucket.count++;
      if (d.enrichmentStatus === "done") bucket.enriched++;
      if (d.enrichmentStatus === "running" || d.embeddingStatus === "running") {
        bucket.running++;
      }
    }

    return KB_CATEGORY_SLUGS.map((slug) => ({
      slug,
      ...stats[slug],
      enrichmentPct:
        stats[slug].count === 0
          ? 0
          : Math.round((stats[slug].enriched / stats[slug].count) * 100),
    }));
  },
});

export const brainStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId)
      return {
        documentCount: 0,
        sourceCount: 0,
        memoryCount: 0,
        confidence: 0,
        runningJobs: 0,
        learning: false,
      };

    const docs = await ctx.db
      .query("kbDocuments")
      .withIndex("by_user", (qb) => qb.eq("userId", userId))
      .take(2000);
    const activeDocs = docs.filter((d) => !d.archivedAt);

    const memories = await ctx.db
      .query("kbMemories")
      .withIndex("by_user_visible", (qb) =>
        qb.eq("userId", userId).eq("visibleInStream", true)
      )
      .take(2000);

    const sources = await ctx.db
      .query("kbSources")
      .withIndex("by_user", (qb) => qb.eq("userId", userId))
      .collect();

    const runningJobs = await ctx.db
      .query("kbEnrichmentJobs")
      .withIndex("by_user_status", (qb) =>
        qb.eq("userId", userId).eq("status", "running")
      )
      .take(50);
    const queuedJobs = await ctx.db
      .query("kbEnrichmentJobs")
      .withIndex("by_user_status", (qb) =>
        qb.eq("userId", userId).eq("status", "queued")
      )
      .take(50);

    const enriched = activeDocs.filter((d) => d.enrichmentStatus === "done").length;
    const confidence =
      activeDocs.length === 0
        ? 0
        : Math.round((enriched / activeDocs.length) * 100);

    return {
      documentCount: activeDocs.length,
      sourceCount: sources.filter((s) => s.status === "connected").length,
      memoryCount: memories.length,
      confidence,
      runningJobs: runningJobs.length,
      queuedJobs: queuedJobs.length,
      learning: runningJobs.length > 0 || queuedJobs.length > 0,
    };
  },
});

export const memoryStream = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const memories = await ctx.db
      .query("kbMemories")
      .withIndex("by_user_visible", (qb) =>
        qb.eq("userId", userId).eq("visibleInStream", true)
      )
      .order("desc")
      .take(args.limit ?? 30);

    // Hydrate first source doc for each (for "from <doc title>" attribution)
    const out = [];
    for (const m of memories) {
      let sourceTitle = null;
      if (m.sourceDocumentIds && m.sourceDocumentIds.length > 0) {
        const doc = await ctx.db.get(m.sourceDocumentIds[0]);
        sourceTitle = doc?.title ?? null;
      }
      out.push({ ...m, sourceTitle });
    }
    return out;
  },
});

export const enrichmentQueue = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const running = await ctx.db
      .query("kbEnrichmentJobs")
      .withIndex("by_user_status", (qb) =>
        qb.eq("userId", userId).eq("status", "running")
      )
      .take(20);
    const queued = await ctx.db
      .query("kbEnrichmentJobs")
      .withIndex("by_user_status", (qb) =>
        qb.eq("userId", userId).eq("status", "queued")
      )
      .take(20);

    const all = [...running, ...queued];
    const out = [];
    for (const j of all) {
      const doc = await ctx.db.get(j.documentId);
      if (doc && !doc.archivedAt) {
        out.push({ ...j, documentTitle: doc.title });
      }
    }
    return out;
  },
});

export const sources = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("kbSources")
      .withIndex("by_user", (qb) => qb.eq("userId", userId))
      .collect();
  },
});

export const memoriesForDocument = query({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.userId !== userId) return [];

    const memories = await ctx.db
      .query("kbMemories")
      .withIndex("by_user", (qb) => qb.eq("userId", userId))
      .take(500);
    return memories.filter(
      (m) =>
        m.status === "active" &&
        (m.sourceDocumentIds || []).includes(args.documentId)
    );
  },
});

// ---------- Action: semantic search (used by Cmd+K) ----------

export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    categories: v.optional(v.array(CATEGORY_VALIDATOR)),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { matches: [] };

    // Lazy import to keep V8 runtime queries cheap
    const { semanticSearch: doSearch } = await import("./lib/kbContext.js");
    return await doSearch(ctx, {
      userId,
      query: args.query,
      limit: args.limit,
      categories: args.categories,
    });
  },
});

// ---------- Internal helpers used by other modules ----------

export const recordRetrievalInternal = internalMutation({
  args: {
    userId: v.id("users"),
    feature: v.string(),
    documentIds: v.array(v.id("kbDocuments")),
    memoryIds: v.array(v.id("kbMemories")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("logEntries", {
      userId: args.userId,
      type: "kb.retrieved_for_plan",
      title: `KB used by ${args.feature}`,
      description: `${args.documentIds.length} docs, ${args.memoryIds.length} memories`,
      date: new Date().toISOString().split("T")[0],
      category: "knowledge",
    });
  },
});

export const findStakeholderByNameInternal = internalQuery({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    const stakeholders = await ctx.db
      .query("stakeholders")
      .withIndex("by_user", (qb) => qb.eq("userId", args.userId))
      .take(500);
    const target = args.name.trim().toLowerCase();
    return stakeholders.find((s) => s.name.toLowerCase() === target) ?? null;
  },
});

export const getMemoryByIdInternal = internalQuery({
  args: { memoryId: v.id("kbMemories") },
  handler: async (ctx, { memoryId }) => {
    return await ctx.db.get(memoryId);
  },
});
