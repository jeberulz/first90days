/**
 * Whisperer internal queries + mutations (U4).
 *
 * The public `respond` action in convex/whisperer.js runs in Node so it
 * cannot use ctx.db directly. This file exposes the small set of
 * transactional reads/writes the action calls into via runQuery /
 * runMutation.
 *
 * Each handler is INTERNAL — none are reachable from the client.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server.js";
import { assembleContextBundle } from "./lib/whispererContext.js";
import { reserveWithEnvelope, OP_COSTS } from "./lib/rateLimit.js";
import { writePlanEvent } from "./lib/planEventLog.js";

/**
 * Auth + context bundle in a single transactional read. Returns:
 *   { status: "ok", bundle }                 — caller proceeds.
 *   { status: "unauthorized" }              — activity not owned by caller.
 *   { status: "not_found" }                 — activity row missing.
 *   { status: "provider_unavailable" }      — onboarding missing.
 */
export const loadContextBundle = internalQuery({
  args: {
    userId: v.id("users"),
    activityId: v.id("activities"),
  },
  handler: async (ctx, args) => {
    const activity = await ctx.db.get(args.activityId);
    if (!activity) return { status: "not_found" };
    if (activity.userId !== args.userId) {
      return { status: "unauthorized" };
    }

    const bundle = await assembleContextBundle(ctx, {
      userId: args.userId,
      activityId: args.activityId,
    });
    if (!bundle) {
      // assembleContextBundle returns null when onboarding is missing
      // (the activity row exists because we checked above).
      return { status: "provider_unavailable" };
    }
    return { status: "ok", bundle };
  },
});

/**
 * Envelope-returning budget reservation. Differs from the existing
 * `internal.rateLimit.reserve` mutation (which THROWS on over_cents)
 * because U4's typed error envelope wants the structured
 * over_count/over_cents/ok signal back without try/catching a
 * ConvexError.
 *
 * Returns the result of `lib/rateLimit.reserveWithEnvelope` verbatim.
 */
export const reserveWhispererBudget = internalMutation({
  args: {
    userId: v.id("users"),
    op: v.string(),
    estimatedCents: v.optional(v.number()),
    midThread: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const cost =
      typeof args.estimatedCents === "number"
        ? args.estimatedCents
        : OP_COSTS[args.op] ?? OP_COSTS.whisperer;
    return await reserveWithEnvelope(ctx, args.userId, cost, {
      midThread: args.midThread === true,
    });
  },
});

/**
 * Single transactional finisher for a successful `respond` call.
 *
 * Idempotently creates the thread, appends the assistant turn, emits
 * both `whisperer_invoked` and `semantic_classify_scheduled` in the
 * same Convex transaction. Returns the new `threadId` + `turnId` so
 * the caller can schedule the U5 semantic classifier with them.
 *
 * Per the plan: all three writes (thread create-or-reuse + turn
 * append + two events) commit together so a partial failure leaves
 * the substrate consistent. Co-locating in one mutation is the
 * Convex idiom for that invariant.
 */
export const finalizeRespond = internalMutation({
  args: {
    userId: v.id("users"),
    activityId: v.id("activities"),
    role: v.literal("assistant"),
    content: v.string(),
    modelUsed: v.string(),
    latencyMs: v.number(),
    assumptions: v.optional(v.array(v.string())),
    artifact: v.optional(v.string()),
    clarifyingQuestion: v.optional(v.string()),
    tokenCounts: v.optional(
      v.object({ input: v.number(), output: v.number() })
    ),
    invokedPayload: v.any(),
  },
  handler: async (ctx, args) => {
    // 1) Create-or-reuse the thread (idempotent on (userId, activityId)).
    const existing = await ctx.db
      .query("whispererThreads")
      .withIndex("by_user_activity", (q) =>
        q.eq("userId", args.userId).eq("activityId", args.activityId)
      )
      .unique();
    const threadId =
      existing?._id ??
      (await ctx.db.insert("whispererThreads", {
        userId: args.userId,
        activityId: args.activityId,
        status: "open",
        turnCount: 0,
        createdAt: Date.now(),
      }));

    const thread = existing ?? (await ctx.db.get(threadId));
    if (thread.status !== "open") {
      // Should not normally happen — the action guards against
      // calling respond on a capped thread by lazy-creating only when
      // appending. If it does, surface a structured failure.
      throw new Error(`Cannot finalize respond on ${thread.status} thread`);
    }

    // 2) Append the assistant turn with monotonic seq.
    const now = Date.now();
    const seq = thread.turnCount;
    const turnId = await ctx.db.insert("whispererTurns", {
      threadId,
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
    await ctx.db.patch(threadId, {
      turnCount: seq + 1,
      lastTurnAt: now,
    });

    // 3) Emit operational + scheduling events in the same transaction.
    await writePlanEvent(ctx, {
      userId: args.userId,
      eventType: "whisperer_invoked",
      activityId: args.activityId,
      threadId,
      turnId,
      payload: args.invokedPayload,
    });
    await writePlanEvent(ctx, {
      userId: args.userId,
      eventType: "semantic_classify_scheduled",
      activityId: args.activityId,
      threadId,
      turnId,
      deliveryStatus: "pending",
    });

    return { threadId, turnId, seq };
  },
});

// Auth identity resolution is handled via the existing public query
// api.planMutations.getAuthenticatedUserId — see convex/whisperer.js.
