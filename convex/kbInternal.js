import { v } from "convex/values";
import {
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { DEFAULT_IMPORTANCE_BY_SOURCE } from "./lib/kbCategories.js";

/**
 * Internal-only KB helpers. Public CRUD lives in convex/kb.js.
 * These functions are called by:
 *   - convex/kb.js public mutations (after auth has been verified)
 *   - convex/kbPipeline.js (background pipeline actions)
 *   - convex/kbAutoCapture.js (auto-capture from reflections / interactions)
 *   - convex/migrations/legacyKnowledgeToDocuments.js
 *
 * Every function takes userId explicitly because callers have already
 * verified ownership at the public boundary.
 */

const SYNTHETIC_PROVIDERS = [
  { provider: "manual", displayName: "Manual entries" },
  { provider: "upload", displayName: "File uploads" },
  { provider: "reflection_autocapture", displayName: "Daily reflections" },
  { provider: "interaction_autocapture", displayName: "Stakeholder notes" },
  {
    provider: "activity_completion_autocapture",
    displayName: "Activity notes",
  },
  { provider: "ai_generated", displayName: "AI-generated" },
];

// ---------- Read helpers ----------

export const getDocumentInternal = internalQuery({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, { documentId }) => {
    return await ctx.db.get(documentId);
  },
});

export const getDocumentsByIdsInternal = internalQuery({
  args: { documentIds: v.array(v.id("kbDocuments")) },
  handler: async (ctx, { documentIds }) => {
    const out = [];
    for (const id of documentIds) {
      const doc = await ctx.db.get(id);
      if (doc) out.push(doc);
    }
    return out;
  },
});

export const getMemoriesForDocumentInternal = internalQuery({
  args: { documentId: v.id("kbDocuments") },
  handler: async (ctx, { documentId }) => {
    // No index across array fields — scan user's memories instead. Cardinality
    // is bounded (~10x docs per user) so a take(500) ceiling is safe.
    const doc = await ctx.db.get(documentId);
    if (!doc) return [];
    const memories = await ctx.db
      .query("kbMemories")
      .withIndex("by_user", (q) => q.eq("userId", doc.userId))
      .take(500);
    return memories.filter((m) =>
      (m.sourceDocumentIds || []).some((id) => id === documentId)
    );
  },
});

export const getActiveMemoriesForEntityInternal = internalQuery({
  args: {
    userId: v.id("users"),
    entityType: v.union(
      v.literal("stakeholder"),
      v.literal("goal"),
      v.literal("company"),
      v.literal("team"),
      v.literal("product"),
      v.literal("none")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kbMemories")
      .withIndex("by_user_entity", (q) =>
        q
          .eq("userId", args.userId)
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
      )
      .take(200);
  },
});

export const getVisibleMemoriesInternal = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    return await ctx.db
      .query("kbMemories")
      .withIndex("by_user_visible", (q) =>
        q.eq("userId", userId).eq("visibleInStream", true)
      )
      .order("desc")
      .take(limit ?? 50);
  },
});

export const getUserSettingsInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user?.settings ?? null;
  },
});

/**
 * Reset the daily enrichment budget to 0 and stamp today's date. Called from
 * kbPipeline.runEnrich when the persisted resetDate is stale relative to the
 * user's timezone. Idempotent — writing the same date twice is a no-op.
 */
export const resetEnrichmentBudget = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, { userId, date }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;
    const settings = user.settings ?? {};
    const kb = settings.kb ?? {};
    await ctx.db.patch(userId, {
      settings: {
        ...settings,
        kb: {
          ...kb,
          enrichmentBudgetUsedToday: 0,
          enrichmentBudgetResetDate: date,
        },
      },
    });
  },
});

/**
 * Increment the daily enrichment budget by 1. Called after a successful
 * enrichment run. Race with workpool concurrency is bounded by the pool's
 * maxParallelism (2) — at most two increments can overlap.
 */
export const incrementEnrichmentBudget = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;
    const settings = user.settings ?? {};
    const kb = settings.kb ?? {};
    await ctx.db.patch(userId, {
      settings: {
        ...settings,
        kb: {
          ...kb,
          enrichmentBudgetUsedToday:
            (kb.enrichmentBudgetUsedToday ?? 0) + 1,
        },
      },
    });
  },
});

// ---------- Source helpers ----------

/**
 * Ensure the user has one row per synthetic source provider. Idempotent —
 * called eagerly on first KB write so kbDocuments.sourceId always points at
 * a real row.
 */
export const ensureSyntheticSources = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("kbSources")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const have = new Set(existing.map((s) => s.provider));
    const created = {};
    for (const s of existing) created[s.provider] = s._id;
    for (const def of SYNTHETIC_PROVIDERS) {
      if (have.has(def.provider)) continue;
      const id = await ctx.db.insert("kbSources", {
        userId,
        provider: def.provider,
        displayName: def.displayName,
        status: "connected",
        syncedDocCount: 0,
      });
      created[def.provider] = id;
    }
    return created;
  },
});

export const getSourceForProviderInternal = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.union(
      v.literal("manual"),
      v.literal("upload"),
      v.literal("reflection_autocapture"),
      v.literal("interaction_autocapture"),
      v.literal("activity_completion_autocapture"),
      v.literal("ai_generated")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kbSources")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();
  },
});

// ---------- Document helpers ----------

const SOURCE_TYPE_VALIDATOR = v.union(
  v.literal("manual"),
  v.literal("upload"),
  v.literal("reflection_autocapture"),
  v.literal("interaction_autocapture"),
  v.literal("activity_completion_autocapture"),
  v.literal("ai_generated")
);

const CATEGORY_VALIDATOR = v.union(
  v.literal("company_context"),
  v.literal("team_people"),
  v.literal("product_technology"),
  v.literal("processes_workflows"),
  v.literal("goals_notes"),
  v.literal("industry_market")
);

const ENTITY_LINK_VALIDATOR = v.array(
  v.object({
    type: v.union(
      v.literal("stakeholder"),
      v.literal("goal"),
      v.literal("activity")
    ),
    id: v.string(),
  })
);

/**
 * Compute a stable content hash for dedup / re-embed skipping.
 * SHA-256 isn't available in the Convex runtime without a node import, so
 * we use a deterministic FNV-1a hash. Good enough for "did the text change".
 */
function fnvHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function computeContentHash(content) {
  return `fnv1a:${fnvHash(content || "")}:${(content || "").length}`;
}

/**
 * Insert a kbDocument and queue its embed + enrich jobs. Schedules
 * internal.kbPipeline.run via runAfter(0). Returns the new document id.
 *
 * Idempotency: if legacyKnowledgeEntryId is provided and a doc already exists
 * for it, returns the existing id without re-inserting.
 */
export const insertDocument = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.optional(CATEGORY_VALIDATOR),
    sourceType: SOURCE_TYPE_VALIDATOR,
    importance: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("ai_enriched"),
        v.literal("ai_generated"),
        v.literal("imported"),
        v.literal("draft")
      )
    ),
    entityLinks: v.optional(ENTITY_LINK_VALIDATOR),
    legacyKnowledgeEntryId: v.optional(v.id("knowledgeEntries")),
    storageId: v.optional(v.id("_storage")),
    mimeType: v.optional(v.string()),
    // When true, the embed/enrich jobs are NOT queued and kbPipeline.run is
    // NOT scheduled. Used by the company research flow so drafts sit in the
    // DB until the user approves them via kb.approveDraft.
    skipPipeline: v.optional(v.boolean()),
    draftStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("discarded")
      )
    ),
    angle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotency check for legacy migration
    if (args.legacyKnowledgeEntryId) {
      const existing = await ctx.db
        .query("kbDocuments")
        .withIndex("by_user_legacy", (q) =>
          q
            .eq("userId", args.userId)
            .eq("legacyKnowledgeEntryId", args.legacyKnowledgeEntryId)
        )
        .first();
      if (existing) return existing._id;
    }

    // Ensure synthetic sources exist & resolve the matching source row
    await ctx.runMutation(internal.kbInternal.ensureSyntheticSources, {
      userId: args.userId,
    });
    const source = await ctx.db
      .query("kbSources")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.sourceType)
      )
      .first();
    if (!source) {
      throw new Error(
        `No kbSources row for provider ${args.sourceType} (userId=${args.userId})`
      );
    }

    const documentId = await ctx.db.insert("kbDocuments", {
      userId: args.userId,
      title: args.title,
      content: args.content,
      contentHash: computeContentHash(args.content),
      legacyKnowledgeEntryId: args.legacyKnowledgeEntryId,
      category: args.category ?? "goals_notes",
      categoryConfidence: args.category ? 1.0 : undefined,
      importance:
        args.importance ?? DEFAULT_IMPORTANCE_BY_SOURCE[args.sourceType] ?? 50,
      sourceId: source._id,
      sourceType: args.sourceType,
      storageId: args.storageId,
      mimeType: args.mimeType,
      ingestionStatus: "ready",
      embeddingStatus: "pending",
      enrichmentStatus: "pending",
      type: args.type ?? "draft",
      entityLinks: args.entityLinks,
      draftStatus: args.draftStatus,
      angle: args.angle,
    });

    // Bump source counter
    await ctx.db.patch(source._id, {
      syncedDocCount: (source.syncedDocCount ?? 0) + 1,
      lastSyncAt: Date.now(),
    });

    // Queue jobs and schedule the pipeline only when the caller hasn't
    // asked us to hold off. skipPipeline is used by the company research
    // flow — drafts stay out of embed/enrich until the user approves them,
    // at which point kb.approveDraft queues the jobs and kicks the pipeline.
    if (!args.skipPipeline) {
      await ctx.db.insert("kbEnrichmentJobs", {
        userId: args.userId,
        documentId,
        kind: "embed",
        status: "queued",
        attempts: 0,
      });
      await ctx.db.insert("kbEnrichmentJobs", {
        userId: args.userId,
        documentId,
        kind: "enrich",
        status: "queued",
        attempts: 0,
      });
    }

    // Audit log
    await ctx.db.insert("logEntries", {
      userId: args.userId,
      type: "kb.created",
      title: args.title,
      description: `Source: ${args.sourceType}`,
      date: new Date().toISOString().split("T")[0],
      category: "knowledge",
    });

    if (!args.skipPipeline) {
      await ctx.scheduler.runAfter(0, internal.kbPipeline.run, { documentId });
    }

    return documentId;
  },
});

/**
 * Patch pipeline state on a document. Used by every pipeline step.
 */
export const patchDocumentPipelineState = internalMutation({
  args: {
    documentId: v.id("kbDocuments"),
    embeddingStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("skipped")
      )
    ),
    enrichmentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("skipped")
      )
    ),
    ingestionStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("extracting"),
        v.literal("ready"),
        v.literal("failed")
      )
    ),
    ragEntryId: v.optional(v.string()),
    lastEmbeddedHash: v.optional(v.string()),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { documentId, ...rest } = args;
    const updates = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(documentId, updates);
    }
  },
});

/**
 * Patch enrichment outputs on a document.
 */
export const patchDocumentEnrichment = internalMutation({
  args: {
    documentId: v.id("kbDocuments"),
    summary: v.optional(v.string()),
    keyFacts: v.optional(v.array(v.string())),
    importance: v.optional(v.number()),
    category: v.optional(CATEGORY_VALIDATOR),
    categoryConfidence: v.optional(v.number()),
    entityLinks: v.optional(ENTITY_LINK_VALIDATOR),
    type: v.optional(
      v.union(
        v.literal("ai_enriched"),
        v.literal("ai_generated"),
        v.literal("imported"),
        v.literal("draft")
      )
    ),
    enrichmentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("skipped")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { documentId, ...rest } = args;
    const updates = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(documentId, updates);
    }
  },
});

// ---------- Job helpers ----------

export const findJobInternal = internalQuery({
  args: {
    documentId: v.id("kbDocuments"),
    kind: v.union(
      v.literal("embed"),
      v.literal("enrich"),
      v.literal("memory_consolidate"),
      v.literal("extract_text")
    ),
  },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("kbEnrichmentJobs")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    return jobs.find((j) => j.kind === args.kind) ?? null;
  },
});

export const markJobStarted = internalMutation({
  args: { jobId: v.id("kbEnrichmentJobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return;
    await ctx.db.patch(jobId, {
      status: "running",
      startedAt: Date.now(),
      attempts: (job.attempts ?? 0) + 1,
    });
  },
});

export const markJobFinished = internalMutation({
  args: {
    jobId: v.id("kbEnrichmentJobs"),
    status: v.union(v.literal("done"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      finishedAt: Date.now(),
      error: args.error,
    });
  },
});

// ---------- Memory helpers ----------

const MEMORY_TYPE_VALIDATOR = v.union(
  v.literal("behavioral"),
  v.literal("people"),
  v.literal("technical"),
  v.literal("goal"),
  v.literal("process"),
  v.literal("cultural")
);

const MEMORY_ENTITY_TYPE_VALIDATOR = v.union(
  v.literal("stakeholder"),
  v.literal("goal"),
  v.literal("company"),
  v.literal("team"),
  v.literal("product"),
  v.literal("none")
);

export const insertMemoryCandidate = internalMutation({
  args: {
    userId: v.id("users"),
    text: v.string(),
    type: MEMORY_TYPE_VALIDATOR,
    confidence: v.number(),
    entityType: v.optional(MEMORY_ENTITY_TYPE_VALIDATOR),
    entityId: v.optional(v.string()),
    sourceDocumentIds: v.array(v.id("kbDocuments")),
    sourceChunkRefs: v.optional(
      v.array(
        v.object({
          documentId: v.id("kbDocuments"),
          chunkIndex: v.number(),
          snippet: v.string(),
        })
      )
    ),
    extractedBy: v.union(
      v.literal("claude"),
      v.literal("openai"),
      v.literal("user")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("kbMemories", {
      ...args,
      status: "candidate",
      visibleInStream: false,
    });
  },
});

export const promoteMemoryToActive = internalMutation({
  args: { memoryId: v.id("kbMemories") },
  handler: async (ctx, { memoryId }) => {
    await ctx.db.patch(memoryId, {
      status: "active",
      visibleInStream: true,
    });
  },
});

export const supersedeMemory = internalMutation({
  args: {
    memoryId: v.id("kbMemories"),
    supersededBy: v.id("kbMemories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, {
      status: "superseded",
      supersededBy: args.supersededBy,
      visibleInStream: false,
    });
  },
});
