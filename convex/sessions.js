import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthSessionId } from "@convex-dev/auth/server";
import { auth } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const currentSessionId = await getAuthSessionId(ctx);
    const now = Date.now();

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .take(50);

    return sessions
      .filter((s) => !s.expirationTime || s.expirationTime > now)
      .map((s) => ({
        _id: s._id,
        _creationTime: s._creationTime,
        expirationTime: s.expirationTime,
        isCurrent: s._id === currentSessionId,
      }));
  },
});

export const revoke = mutation({
  args: { sessionId: v.id("authSessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    const currentSessionId = await getAuthSessionId(ctx);
    if (sessionId === currentSessionId) {
      throw new Error("Cannot revoke current session");
    }

    await ctx.db.delete(sessionId);
  },
});

export const revokeAllOther = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentSessionId = await getAuthSessionId(ctx);

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .take(200);

    let revoked = 0;
    for (const session of sessions) {
      if (session._id !== currentSessionId) {
        await ctx.db.delete(session._id);
        revoked++;
      }
    }
    return { revoked };
  },
});
