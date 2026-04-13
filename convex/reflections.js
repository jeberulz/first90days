import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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

    return await ctx.db.insert("weeklyReviews", {
      userId,
      ...args,
    });
  },
});
