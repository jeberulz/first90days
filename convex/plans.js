import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

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
