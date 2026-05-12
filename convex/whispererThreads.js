import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { auth } from "./auth";

/**
 * Whisperer chat threads — per-task AI conversation storage.
 *
 * One thread per (userId, activityId). Threads are created lazily the
 * first time a user opens the whisperer on a task; subsequent opens
 * reuse the same row so the conversation history persists.
 *
 * These are INTERNAL functions — the public API layer (a separate file
 * that wraps these with auth checks and AI orchestration) calls them
 * via ctx.runMutation/ctx.runQuery. Keeping the storage primitives
 * internal lets the orchestration layer enforce ownership, billing
 * caps, and cost budgets without those concerns leaking into the data
 * layer.
 */

const TURN_ROLE = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system")
);

const CAPPED_REASON = v.union(
  v.literal("turn_limit"),
  v.literal("cents_ceiling"),
  v.literal("mark_done"),
  v.literal("escalate"),
  v.literal("close_unresolved")
);

/**
 * Idempotent thread creation. If a thread already exists for the given
 * (userId, activityId) pair, returns the existing thread id without
 * creating a new row. This means the orchestration layer can safely
 * call createThread on every "open whisperer" click without worrying
 * about whether a thread is already on disk.
 */
export const createThread = internalMutation({
  args: {
    userId: v.id("users"),
    activityId: v.id("activities"),
  },
  handler: async (ctx, args) => {
    // Reuse-only-open: an existing closed/capped thread does not block
    // creating a fresh open thread for the same activity (required by
    // the user-initiated "start fresh" flow).
    const existingOpen = await ctx.db
      .query("whispererThreads")
      .withIndex("by_user_activity", (q) =>
        q.eq("userId", args.userId).eq("activityId", args.activityId)
      )
      .filter((q) => q.eq(q.field("status"), "open"))
      .order("desc")
      .first();
    if (existingOpen) return existingOpen._id;

    return await ctx.db.insert("whispererThreads", {
      userId: args.userId,
      activityId: args.activityId,
      status: "open",
      turnCount: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Append a single turn to a thread. Increments `turnCount` and updates
 * `lastTurnAt` on the parent row in the same transaction — Convex
 * transactional guarantees mean two concurrent calls cannot read the
 * same turnCount and end up with duplicate `seq` values.
 *
 * Rejects when the thread is `capped` or `closed`; callers that
 * intend to reopen a capped thread must explicitly patch the status
 * back to "open" first (out of scope for v1).
 */
export const appendTurn = internalMutation({
  args: {
    threadId: v.id("whispererThreads"),
    role: TURN_ROLE,
    content: v.string(),
    modelUsed: v.string(),
    latencyMs: v.number(),
    assumptions: v.optional(v.array(v.string())),
    artifact: v.optional(v.string()),
    clarifyingQuestion: v.optional(v.string()),
    tokenCounts: v.optional(
      v.object({
        input: v.number(),
        output: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.status !== "open") {
      throw new Error(`Cannot append turn to ${thread.status} thread`);
    }

    const now = Date.now();
    const seq = thread.turnCount;

    const turnId = await ctx.db.insert("whispererTurns", {
      threadId: args.threadId,
      seq,
      role: args.role,
      content: args.content,
      assumptions: args.assumptions,
      artifact: args.artifact,
      clarifyingQuestion: args.clarifyingQuestion,
      modelUsed: args.modelUsed,
      tokenCounts: args.tokenCounts,
      latencyMs: args.latencyMs,
      createdAt: now,
    });

    await ctx.db.patch(args.threadId, {
      turnCount: seq + 1,
      lastTurnAt: now,
    });

    return { turnId, seq };
  },
});

/**
 * Read all turns on a thread, ordered by their monotonic `seq`. The
 * full set of turns for a single task is bounded (the whisperer caps
 * at a small turn count enforced by the orchestration layer), so
 * collect() is safe here — the per-thread upper bound IS the bound.
 */
export const listTurns = internalQuery({
  args: { threadId: v.id("whispererThreads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whispererTurns")
      .withIndex("by_thread_seq", (q) => q.eq("threadId", args.threadId))
      .collect();
  },
});

/**
 * Look up the existing thread for (userId, activityId). Returns null
 * if the user has never opened the whisperer on this task. Powers AE4:
 * reopening Task A returns the same thread with prior turns visible;
 * reopening Task B (no thread yet) returns null and the orchestration
 * layer lazily creates one when the first user message arrives.
 */
export const getByActivity = internalQuery({
  args: {
    userId: v.id("users"),
    activityId: v.id("activities"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whispererThreads")
      .withIndex("by_user_activity", (q) =>
        q.eq("userId", args.userId).eq("activityId", args.activityId)
      )
      .filter((q) => q.neq(q.field("status"), "closed"))
      .order("desc")
      .first();
  },
});

/**
 * Atomic transition from `open` → `capped` with a recorded reason.
 * Idempotent for already-capped threads (with the same reason); throws
 * if the thread is already closed.
 */
export const markCapped = internalMutation({
  args: {
    threadId: v.id("whispererThreads"),
    reason: CAPPED_REASON,
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.status === "closed") {
      throw new Error("Cannot cap a closed thread");
    }
    if (thread.status === "capped") {
      // Already capped — no-op; keeps the original reason untouched
      // so we don't overwrite the historical signal.
      return;
    }
    await ctx.db.patch(args.threadId, {
      status: "capped",
      cappedReason: args.reason,
    });
  },
});

/**
 * Public read query for U7. Returns the user's most recent NON-CLOSED
 * thread + ordered turns for a given activity. Closed threads are
 * deliberately hidden so the affordance reverts to "help with this"
 * after a user-initiated start-fresh. Capped threads are returned so
 * the UI can show the soft-block recap.
 *
 * Auth-checked: caller must own the activity.
 */
export const listByActivity = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const activity = await ctx.db.get(args.activityId);
    if (!activity || activity.userId !== userId) return null;

    const thread = await ctx.db
      .query("whispererThreads")
      .withIndex("by_user_activity", (q) =>
        q.eq("userId", userId).eq("activityId", args.activityId)
      )
      .filter((q) => q.neq(q.field("status"), "closed"))
      .order("desc")
      .first();
    if (!thread) return null;

    const turns = await ctx.db
      .query("whispererTurns")
      .withIndex("by_thread_seq", (q) => q.eq("threadId", thread._id))
      .collect();

    return { thread, turns };
  },
});

/**
 * User-initiated close. Distinct from `markCapped` (system-initiated
 * for turn/cents caps). Flips the most recent OPEN thread on this
 * activity to status="closed" so subsequent `respond` calls mint a
 * fresh thread instead of appending to the prior conversation.
 *
 * Idempotent: a no-op when no open thread exists. Soft-fails on
 * cross-user access (returns null rather than throwing) — UI calls
 * this as fire-and-forget telemetry-style.
 *
 * Used by the "start fresh" button in WhispererResponse.
 */
export const closeThread = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const activity = await ctx.db.get(args.activityId);
    if (!activity || activity.userId !== userId) return null;

    const open = await ctx.db
      .query("whispererThreads")
      .withIndex("by_user_activity", (q) =>
        q.eq("userId", userId).eq("activityId", args.activityId)
      )
      .filter((q) => q.eq(q.field("status"), "open"))
      .order("desc")
      .first();
    if (!open) return null;

    await ctx.db.patch(open._id, {
      status: "closed",
      cappedReason: "close_unresolved",
    });
    return open._id;
  },
});
