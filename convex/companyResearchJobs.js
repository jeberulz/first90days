import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

/**
 * Public API + non-node helpers for the company research flow. The actual
 * LLM call lives in convex/companyResearch.js (which is "use node"). This
 * file owns:
 *
 *   - The public mutation `requestCompanyResearch` that the onboarding UI
 *     calls to kick off a run.
 *   - The public query `currentResearchJob` that the review queue reads.
 *   - Internal read/write helpers the node action calls via ctx.runQuery /
 *     ctx.runMutation.
 *
 * Drafts flow:
 *   1. UI calls requestCompanyResearch (this file)
 *   2. A companyResearchJobs row is inserted as "queued"
 *   3. generateDraftsForUser (node action) is scheduled
 *   4. Action reads onboarding snapshot, calls generateText, parses JSON
 *   5. Each draft is inserted as a pending kbDocument via insertDraftInternal
 *   6. Job row is marked done
 *
 * The draft ingest deliberately skips the embed/enrich pipeline — drafts
 * wait in the review queue until the user approves them via kb.approveDraft.
 */

// ---------- Internal helpers (called from node action) ----------

export const getOnboardingForResearchInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const markJobRunning = internalMutation({
  args: { jobId: v.id("companyResearchJobs") },
  handler: async (ctx, { jobId }) => {
    await ctx.db.patch(jobId, {
      status: "running",
      startedAt: Date.now(),
    });
  },
});

export const markJobDone = internalMutation({
  args: {
    jobId: v.id("companyResearchJobs"),
    draftCount: v.number(),
  },
  handler: async (ctx, { jobId, draftCount }) => {
    await ctx.db.patch(jobId, {
      status: "done",
      draftCount,
      finishedAt: Date.now(),
    });
  },
});

export const markJobFailed = internalMutation({
  args: {
    jobId: v.id("companyResearchJobs"),
    error: v.string(),
  },
  handler: async (ctx, { jobId, error }) => {
    await ctx.db.patch(jobId, {
      status: "failed",
      error,
      finishedAt: Date.now(),
    });
  },
});

/**
 * Insert a single company-research draft as a kbDocument. Delegates to
 * kbInternal.insertDocument with skipPipeline=true so the draft does NOT
 * get embedded/enriched until the user approves it. Ownership was already
 * verified by the action's caller (requestCompanyResearch is auth-gated).
 */
export const insertDraftInternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    angle: v.string(),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.runMutation(
      internal.kbInternal.insertDocument,
      {
        userId: args.userId,
        title: args.title,
        content: args.content,
        category: "company_context",
        sourceType: "ai_generated",
        type: "draft",
        skipPipeline: true,
        draftStatus: "pending",
        angle: args.angle,
      }
    );
    return documentId;
  },
});

// ---------- Public mutation: trigger a research run ----------

/**
 * Public entry point for the onboarding UI (and a future "re-run research"
 * button). Creates a companyResearchJobs row and schedules the node action.
 *
 * Guards:
 *   - Must be authenticated
 *   - Onboarding must be completed (onboardingData row must exist)
 *   - Won't start a new run if one is already running or queued (returns
 *     the existing job id instead)
 */
export const requestCompanyResearch = mutation({
  args: {
    trigger: v.optional(
      v.union(v.literal("onboarding"), v.literal("manual"))
    ),
  },
  handler: async (ctx, { trigger }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!onboarding) {
      throw new Error("Onboarding must be completed before running research");
    }

    // Prevent concurrent runs — check for an in-flight job.
    const runningJob = await ctx.db
      .query("companyResearchJobs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "running")
      )
      .first();
    if (runningJob) return runningJob._id;

    const queuedJob = await ctx.db
      .query("companyResearchJobs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "queued")
      )
      .first();
    if (queuedJob) return queuedJob._id;

    const jobId = await ctx.db.insert("companyResearchJobs", {
      userId,
      status: "queued",
      trigger: trigger ?? "manual",
      inputSnapshot: {
        companyName: onboarding.companyName,
        roleTitle: onboarding.roleTitle,
        industry: onboarding.industry,
        companySize: onboarding.companySize,
        companyStage: onboarding.companyStage,
        starsSituation: onboarding.starsSituation,
        scope: onboarding.scope,
        jobDescription: onboarding.jobDescription,
      },
    });

    await ctx.scheduler.runAfter(
      0,
      internal.companyResearch.generateDraftsForUser,
      { userId, jobId }
    );

    return jobId;
  },
});

// ---------- Public query: most recent research job for the user ----------

export const currentResearchJob = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("companyResearchJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});
