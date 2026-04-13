import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";
import { resolvePlanAccess } from "./lib/planAccess";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getFull = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) return null;

    const phases = await ctx.db
      .query("phases")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();

    const weeks = await ctx.db
      .query("weeks")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();

    return {
      ...plan,
      phases: phases.sort((a, b) => a.number - b.number),
      weeks: weeks.sort((a, b) => a.number - b.number),
      activities,
    };
  },
});

export const getPhases = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("phases")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getWeeks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) return [];

    return await ctx.db
      .query("weeks")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();
  },
});

// ── Shared (collaborator) reads ──────────────────────────────────────────
// These take an explicit planId and check planCollaborators access. They
// return the same shape as the owner-side reads so the read-only manager
// view can reuse most of the rendering.

export const getSharedFull = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const access = await resolvePlanAccess(ctx, args.planId);
    if (!access) return null;
    const { plan } = access;

    const phases = await ctx.db
      .query("phases")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();
    const weeks = await ctx.db
      .query("weeks")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();

    const owner = await ctx.db.get(plan.userId);
    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", plan.userId))
      .first();
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", plan.userId))
      .collect();

    return {
      ...plan,
      phases: phases.sort((a, b) => a.number - b.number),
      weeks: weeks.sort((a, b) => a.number - b.number),
      activities,
      goals,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      roleTitle: onboarding?.roleTitle ?? null,
      companyName: onboarding?.companyName ?? null,
      startDate: onboarding?.startDate ?? null,
      viewerRole: access.role,
    };
  },
});

export const getSharedWeekActivities = query({
  args: { planId: v.id("plans"), weekNumber: v.number() },
  handler: async (ctx, args) => {
    const access = await resolvePlanAccess(ctx, args.planId);
    if (!access) return null;
    const { plan } = access;

    const week = await ctx.db
      .query("weeks")
      .withIndex("by_plan_number", (q) =>
        q.eq("planId", plan._id).eq("number", args.weekNumber)
      )
      .first();

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_plan_week", (q) =>
        q.eq("planId", plan._id).eq("weekNumber", args.weekNumber)
      )
      .collect();

    return {
      week,
      activities,
      viewerRole: access.role,
    };
  },
});
