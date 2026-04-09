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
