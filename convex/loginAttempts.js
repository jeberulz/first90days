import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { auth } from "./auth";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export const checkLockout = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalised = email.trim().toLowerCase();
    const row = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .first();
    if (!row) return { locked: false, remainingMs: 0 };

    const now = Date.now();

    if (row.lockedUntil && row.lockedUntil > now) {
      return { locked: true, remainingMs: row.lockedUntil - now };
    }

    if (now - row.firstAttemptAt > WINDOW_MS) {
      return { locked: false, remainingMs: 0 };
    }

    return { locked: false, remainingMs: 0 };
  },
});

export const trackFailedAttempt = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalised = email.trim().toLowerCase();
    const now = Date.now();

    const row = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .first();

    if (!row) {
      await ctx.db.insert("loginAttempts", {
        email: normalised,
        attempts: 1,
        firstAttemptAt: now,
      });
      return { locked: false, remainingMs: 0 };
    }

    if (now - row.firstAttemptAt > WINDOW_MS) {
      await ctx.db.patch(row._id, {
        attempts: 1,
        firstAttemptAt: now,
        lockedUntil: undefined,
      });
      return { locked: false, remainingMs: 0 };
    }

    const newAttempts = row.attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_MS;
      await ctx.db.patch(row._id, {
        attempts: newAttempts,
        lockedUntil,
      });
      return { locked: true, remainingMs: LOCKOUT_MS };
    }

    await ctx.db.patch(row._id, { attempts: newAttempts });
    return { locked: false, remainingMs: 0 };
  },
});

export const clearAttempts = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalised = email.trim().toLowerCase();
    const row = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .first();
    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});

export const clearMyAttempts = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return;
    const user = await ctx.db.get(userId);
    if (!user?.email) return;
    const row = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .first();
    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});
