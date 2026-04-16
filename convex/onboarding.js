import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const save = mutation({
  args: {
    roleTitle: v.string(),
    startDate: v.string(),
    experienceYears: v.number(),
    isFirstRoleAtLevel: v.boolean(),
    roleType: v.string(),
    function_: v.string(),
    teamSize: v.optional(v.number()),
    isNewTeam: v.boolean(),
    scope: v.optional(v.string()),
    companyName: v.string(),
    companySize: v.string(),
    companyStage: v.string(),
    workModel: v.string(),
    industry: v.optional(v.string()),
    starsSituation: v.string(),
    reportsTo: v.optional(v.string()),
    selectedGoals: v.optional(v.array(v.string())),
    existingContext: v.optional(v.string()),
    challenges: v.optional(v.string()),
    successDefinition: v.optional(v.string()),
    jobDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("onboardingData", {
      userId,
      ...args,
    });
  },
});

/**
 * Patch a subset of onboarding fields post-onboarding. Used by the
 * Settings page so users can correct or enrich their plan context
 * without re-running the whole onboarding flow. Only exposes fields
 * that are safe to edit mid-plan (we deliberately do NOT let users
 * change structural fields like starsSituation, companyName, startDate
 * — those would invalidate the generated plan).
 */
export const updateContext = mutation({
  args: {
    scope: v.optional(v.string()),
    reportsTo: v.optional(v.string()),
    selectedGoals: v.optional(v.array(v.string())),
    existingContext: v.optional(v.string()),
    challenges: v.optional(v.string()),
    successDefinition: v.optional(v.string()),
    jobDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) throw new Error("No onboarding data found");

    const patch = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length === 0) return existing._id;

    await ctx.db.patch(existing._id, patch);
    return existing._id;
  },
});
