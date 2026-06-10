import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Join the waitlist. Silently deduplicates — if the email already exists,
// returns the existing record without error so the UX stays smooth.
export const join = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { email, source }) => {
    const normalized = email.trim().toLowerCase();

    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();

    if (existing) {
      return { id: existing._id, alreadySignedUp: true };
    }

    const id = await ctx.db.insert("waitlistSignups", {
      email: normalized,
      source: source ?? "unknown",
      createdAt: Date.now(),
    });

    return { id, alreadySignedUp: false };
  },
});
