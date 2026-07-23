import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const submit = mutation({
  args: {
    rating: v.number(),
    text: v.optional(v.string()),
    dayNumber: v.optional(v.number()),
    source: v.union(v.literal("button"), v.literal("prompt")),
  },
  handler: async (ctx, { rating, text, dayNumber, source }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (rating < 1 || rating > 5) throw new Error("Rating must be 1-5");

    await ctx.db.insert("feedbackSubmissions", {
      userId,
      rating,
      text: text?.trim() || undefined,
      submittedAt: new Date().toISOString(),
      dayNumber,
      source,
    });
  },
});

// Returns the most recent submission for the authenticated user (or null).
// Used client-side to enforce the 30-day cooldown without exposing all rows.
export const getLastSubmission = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const rows = await ctx.db
      .query("feedbackSubmissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);

    return rows[0] ?? null;
  },
});
