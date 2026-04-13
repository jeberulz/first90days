import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

export const getStreak = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return 0;

    const reflections = await ctx.db
      .query("dailyReflections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (reflections.length === 0) return 0;

    const dates = reflections
      .map((r) => r.date)
      .sort()
      .reverse();

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    if (dates[0] !== today && dates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  },
});

export const getDailyByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("dailyReflections")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();
  },
});

export const saveDailyReflection = mutation({
  args: {
    date: v.string(),
    energyLevel: v.number(),
    topAccomplishment: v.optional(v.string()),
    reflectionPrompt: v.string(),
    reflectionResponse: v.string(),
    blockers: v.optional(v.string()),
    tomorrowFocus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("dailyReflections")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    let reflectionId;
    if (existing) {
      await ctx.db.patch(existing._id, args);
      reflectionId = existing._id;
    } else {
      reflectionId = await ctx.db.insert("dailyReflections", {
        userId,
        ...args,
      });
    }

    // Auto-capture into the KB brain (opt-out via users.settings.kb.autoIngestReflections).
    await ctx.scheduler.runAfter(0, internal.kbAutoCapture.fromReflection, {
      reflectionId,
    });

    return reflectionId;
  },
});

export const saveWeeklyReview = mutation({
  args: {
    weekNumber: v.number(),
    date: v.string(),
    rating: v.number(),
    questionResponses: v.array(
      v.object({ question: v.string(), response: v.string() })
    ),
    activitiesCompleted: v.number(),
    activitiesPlanned: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Re-submission in-place: if this user already has a review for this
    // week number we update it and re-run the AI summary. Keeps history
    // clean (one row per user/week) and lets users revise an existing
    // review without orphaning the previous summary.
    const existing = await ctx.db
      .query("weeklyReviews")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", userId).eq("weekNumber", args.weekNumber)
      )
      .first();

    let reviewId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        aiSummary: undefined,
        aiSummaryStatus: "pending",
        aiSummaryGeneratedAt: undefined,
        aiSummaryError: undefined,
      });
      reviewId = existing._id;
    } else {
      reviewId = await ctx.db.insert("weeklyReviews", {
        userId,
        ...args,
        aiSummaryStatus: "pending",
      });
    }

    // Fire-and-forget AI summary. The UI reads the row reactively and
    // will flip from "generating" to "done" once the action patches it.
    await ctx.scheduler.runAfter(0, internal.ai.generateWeeklySummary, {
      reviewId,
    });

    return reviewId;
  },
});

/**
 * Fetch a user's weekly review for a specific week number.
 * Returns null if they haven't submitted one yet.
 */
export const getWeeklyReview = query({
  args: { weekNumber: v.number() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("weeklyReviews")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", userId).eq("weekNumber", args.weekNumber)
      )
      .first();
  },
});

/**
 * List all weekly reviews for the current user, newest week first.
 * Used by the history / summaries page.
 */
export const listWeeklyReviews = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const reviews = await ctx.db
      .query("weeklyReviews")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return reviews.sort((a, b) => b.weekNumber - a.weekNumber);
  },
});

/**
 * Internal: read a weekly review row for the AI action. Kept internal
 * because actions can only reach db state via runQuery.
 */
export const getWeeklyReviewInternal = internalQuery({
  args: { reviewId: v.id("weeklyReviews") },
  handler: async (ctx, { reviewId }) => {
    return await ctx.db.get(reviewId);
  },
});

/**
 * Internal: pull all activities for a user + week number so the AI
 * summary action can ground itself in what actually happened.
 */
export const getActivitiesForWeekInternal = internalQuery({
  args: { userId: v.id("users"), weekNumber: v.number() },
  handler: async (ctx, { userId, weekNumber }) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("weekNumber"), weekNumber))
      .collect();
  },
});

/**
 * Internal: patch the summary result onto the review row. Called from
 * the AI action on success or failure.
 */
export const setWeeklySummary = internalMutation({
  args: {
    reviewId: v.id("weeklyReviews"),
    status: v.union(
      v.literal("generating"),
      v.literal("done"),
      v.literal("failed")
    ),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { reviewId, status, summary, error }) => {
    const patch = { aiSummaryStatus: status };
    if (status === "done") {
      patch.aiSummary = summary;
      patch.aiSummaryGeneratedAt = Date.now();
      patch.aiSummaryError = undefined;
    } else if (status === "failed") {
      patch.aiSummaryError = error || "Unknown error";
    }
    await ctx.db.patch(reviewId, patch);
  },
});
