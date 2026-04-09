import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

export const list = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    if (args.type) {
      return await ctx.db
        .query("logEntries")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", userId).eq("type", args.type)
        )
        .collect();
    }

    return await ctx.db
      .query("logEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    category: v.string(),
    relatedGoalId: v.optional(v.id("goals")),
    impact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("logEntries", {
      userId,
      ...args,
    });
  },
});
