import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { emitTaskCompleteAcceptIfRecent } from "./whispererTelemetry";
import {
  scheduleYmd,
  resolveUserTimezone,
  tzTodayYmd,
} from "./lib/planDates";

export const getToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    const today = tzTodayYmd(resolveUserTimezone(user));

    return await ctx.db
      .query("activities")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("scheduledDate", today)
      )
      .collect();
  },
});

export const getByWeek = query({
  args: { weekNumber: v.number() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("activities")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", userId).eq("weekNumber", args.weekNumber)
      )
      .collect();
  },
});

export const getByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("activities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", args.status)
      )
      .collect();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const complete = mutation({
  args: {
    id: v.id("activities"),
    completionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.id);
    if (!activity || activity.userId !== userId) {
      throw new Error("Activity not found");
    }

    const completedAtMs = Date.now();
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: new Date(completedAtMs).toISOString(),
      completionNotes: args.completionNotes,
    });

    // Auto-capture into the KB brain when there are non-empty completion notes.
    if (args.completionNotes && args.completionNotes.trim()) {
      await ctx.scheduler.runAfter(
        0,
        internal.kbAutoCapture.fromActivityCompletion,
        { activityId: args.id }
      );
    }

    // Emit whisperer_accepted with path=task_complete when a recent
    // whisperer turn precedes the completion (U8 north-star metric).
    // Soft-fails; never blocks the task-complete write.
    await emitTaskCompleteAcceptIfRecent(ctx, {
      userId,
      activityId: args.id,
      completedAt: completedAtMs,
    });
  },
});

export const skip = mutation({
  args: {
    id: v.id("activities"),
    skipReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.id);
    if (!activity || activity.userId !== userId) {
      throw new Error("Activity not found");
    }

    await ctx.db.patch(args.id, {
      status: "skipped",
      skipReason: args.skipReason,
    });
  },
});

export const reschedule = mutation({
  args: {
    id: v.id("activities"),
    newDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.id);
    if (!activity || activity.userId !== userId) {
      throw new Error("Activity not found");
    }

    await ctx.db.patch(args.id, {
      scheduledDate: args.newDate,
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    estimatedTime: v.string(),
    priority: v.string(),
    scheduledDate: v.optional(v.string()),
    scheduledDay: v.optional(v.number()),
    weekNumber: v.number(),
    relatedStakeholderId: v.optional(v.id("stakeholders")),
    relatedGoalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) throw new Error("No plan found");

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const startYmd =
      onboarding?.startDate ?? new Date().toISOString().split("T")[0];

    let weekNumber = args.weekNumber;
    let scheduledDate = args.scheduledDate;
    let scheduledDay = args.scheduledDay;

    if (scheduledDay !== undefined) {
      scheduledDate =
        scheduledDate ?? scheduleYmd(startYmd, scheduledDay);
      weekNumber = Math.min(
        Math.max(Math.ceil(scheduledDay / 7), 1),
        12
      );
    }

    const week = await ctx.db
      .query("weeks")
      .withIndex("by_user_number", (q) =>
        q.eq("userId", userId).eq("number", weekNumber)
      )
      .first();
    if (!week) throw new Error("Week not found");

    return await ctx.db.insert("activities", {
      planId: plan._id,
      weekId: week._id,
      userId,
      weekNumber,
      title: args.title,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      estimatedTime: args.estimatedTime,
      priority: args.priority,
      scheduledDate,
      scheduledDay,
      status: "upcoming",
      isCustom: true,
      source: "user",
      relatedStakeholderId: args.relatedStakeholderId,
      relatedGoalId: args.relatedGoalId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("activities"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedTime: v.optional(v.string()),
    priority: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    scheduledDay: v.optional(v.number()),
    weekNumber: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.id);
    if (!activity || activity.userId !== userId) {
      throw new Error("Activity not found");
    }

    const { id, scheduledDay, weekNumber, ...rest } = args;
    const filtered = Object.fromEntries(
      Object.entries(rest).filter(([, val]) => val !== undefined)
    );

    if (scheduledDay !== undefined) {
      const onboarding = await ctx.db
        .query("onboardingData")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      const startYmd =
        onboarding?.startDate ?? new Date().toISOString().split("T")[0];
      filtered.scheduledDay = scheduledDay;
      filtered.scheduledDate = scheduleYmd(startYmd, scheduledDay);
      const wn = Math.min(Math.max(Math.ceil(scheduledDay / 7), 1), 12);
      const week = await ctx.db
        .query("weeks")
        .withIndex("by_user_number", (q) =>
          q.eq("userId", userId).eq("number", wn)
        )
        .first();
      if (!week) throw new Error("Week not found");
      filtered.weekId = week._id;
      filtered.weekNumber = wn;
    } else if (weekNumber !== undefined) {
      const week = await ctx.db
        .query("weeks")
        .withIndex("by_user_number", (q) =>
          q.eq("userId", userId).eq("number", weekNumber)
        )
        .first();
      if (!week) throw new Error("Week not found");
      filtered.weekId = week._id;
      filtered.weekNumber = weekNumber;
    }

    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.id);
    if (!activity || activity.userId !== userId) {
      throw new Error("Activity not found");
    }

    await ctx.db.delete(args.id);
  },
});
