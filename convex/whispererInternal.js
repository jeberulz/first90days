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

/**
 * U5 helper: single transactional read of a turn + its parent thread +
 * activity + linked stakeholder + user role/phase plus the user's full
 * stakeholders list. Used by `internal.whispererSemantic.classifyTurnSemantic`
 * (a Node action) so it never touches `ctx.db` directly.
 *
 * Returns `null` when the turn is missing — the action treats this as
 * an unrecoverable input (race with cascade delete, etc.) and exits
 * without emitting any event rows.
 *
 * Stakeholders are returned as `{ _id, name, firstMentionedAt }` only
 * (we don't need the full row) and are bounded by `.take(200)` — well
 * above the v1 expected ceiling but a safety bound on the array.
 */
export const loadTurnAndContext = internalQuery({
  args: {
    turnId: v.id("whispererTurns"),
  },
  handler: async (ctx, args) => {
    const turn = await ctx.db.get(args.turnId);
    if (!turn) return null;

    const thread = await ctx.db.get(turn.threadId);
    if (!thread) return null;

    const activity = await ctx.db.get(thread.activityId);
    if (!activity) return null;

    // Onboarding for role + plan startDate.
    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", thread.userId))
      .first();

    // Phase via activity.weekId -> weeks.phaseId.
    let phaseRow = null;
    if (activity.weekId) {
      const week = await ctx.db.get(activity.weekId);
      if (week && week.phaseId) {
        phaseRow = await ctx.db.get(week.phaseId);
      }
    }

    // Linked stakeholder name (when set on the activity).
    let linkedStakeholderName = null;
    if (activity.relatedStakeholderId) {
      const s = await ctx.db.get(activity.relatedStakeholderId);
      if (s && s.userId === thread.userId) {
        linkedStakeholderName = s.name || null;
      }
    }

    // Linked goal `_creationTime` — used by `firstSeenWeek` computation
    // for any future `goal_referenced` type. Currently the U5 taxonomy
    // doesn't emit goal events, but we surface this so U6/U8 don't have
    // to re-query.
    let linkedGoalCreationTime = null;
    if (activity.relatedGoalId) {
      const g = await ctx.db.get(activity.relatedGoalId);
      if (g && g.userId === thread.userId) {
        linkedGoalCreationTime = g._creationTime;
      }
    }

    // All of the user's stakeholders — needed to resolve names in the
    // classifier output to actual rows. Bounded; the resolution path
    // tolerates an empty array.
    const stakeholders = await ctx.db
      .query("stakeholders")
      .withIndex("by_user", (q) => q.eq("userId", thread.userId))
      .take(200);

    return {
      turn: {
        _id: turn._id,
        threadId: turn.threadId,
        content: turn.content,
      },
      thread: {
        _id: thread._id,
        userId: thread.userId,
        activityId: thread.activityId,
      },
      activity: {
        _id: activity._id,
        weekNumber: activity.weekNumber,
      },
      user: {
        role: onboarding?.roleTitle || null,
        phaseName: phaseRow ? phaseRow.name : null,
        phaseNumber: phaseRow ? phaseRow.number : null,
        startDate: onboarding?.startDate || null,
      },
      linkedStakeholderName,
      linkedGoalCreationTime,
      stakeholders: stakeholders.map((s) => ({
        _id: s._id,
        name: s.name,
        firstMentionedAt: s.firstMentionedAt,
      })),
    };
  },
});

/**
 * U5 helper: write a batch of semantic event rows in one transaction so
 * a partial failure doesn't leave the `planEventLog` half-populated for
 * a single classifier run. Each row uses the standard `writePlanEvent`
 * primitive (delivery status defaults to "delivered" for semantic
 * labels, "delivered" for the sentinels too).
 *
 * Accepts a pre-built array so the action can resolve stakeholders,
 * compute `firstSeenWeek`, and build payloads OUTSIDE the transaction
 * (it's a Node action) and then commit the whole set atomically.
 */
export const emitSemanticEvents = internalMutation({
  args: {
    userId: v.id("users"),
    activityId: v.id("activities"),
    threadId: v.id("whispererThreads"),
    turnId: v.id("whispererTurns"),
    events: v.array(
      v.object({
        eventType: v.string(),
        payload: v.optional(v.any()),
        firstSeenWeek: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const ev of args.events) {
      const id = await writePlanEvent(ctx, {
        userId: args.userId,
        eventType: ev.eventType,
        activityId: args.activityId,
        threadId: args.threadId,
        turnId: args.turnId,
        payload: ev.payload,
        firstSeenWeek: ev.firstSeenWeek,
        deliveryStatus: "delivered",
      });
      ids.push(id);
    }
    return ids;
  },
});
/**
 * U6 — Chat continuation transactional helpers.
 *
 * The public `continueThread` action in convex/whisperer.js runs in
 * Node so cannot touch ctx.db directly. It calls into these handlers
 * for each transactional step:
 *
 *  1. `loadThreadAndBundle` — auth-checked thread + context bundle +
 *     turn history in one query.
 *  2. `appendUserTurn` — append the user message; rejects on
 *     capped/closed and returns the post-append turnCount so the
 *     action can decide whether to fire the recap path.
 *  3. `appendAssistantTurnForContinuation` — finalize a normal
 *     continuation turn (emits whisperer_chat_expanded +
 *     semantic_classify_scheduled).
 *  4. `markCappedAndAppendRecap` — atomic recap path: flip status to
 *     capped, append the assistant recap, emit
 *     whisperer_chat_capped.
 */

/**
 * Load (a) the thread by id with auth check, (b) the activity context
 * bundle, and (c) all turns to date — all in one transactional read.
 *
 * Returns:
 *   { status: "ok", bundle, thread, history }
 *   { status: "unauthorized" }   — thread.userId mismatch
 *   { status: "not_found" }       — no thread, or activity gone
 *   { status: "provider_unavailable" } — onboarding missing
 */
export const loadThreadAndBundle = internalQuery({
  args: {
    userId: v.id("users"),
    threadId: v.id("whispererThreads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return { status: "not_found" };
    if (thread.userId !== args.userId) {
      return { status: "unauthorized" };
    }

    const bundle = await assembleContextBundle(ctx, {
      userId: args.userId,
      activityId: thread.activityId,
    });
    if (!bundle) return { status: "provider_unavailable" };

    const turns = await ctx.db
      .query("whispererTurns")
      .withIndex("by_thread_seq", (q) => q.eq("threadId", args.threadId))
      .collect();

    return {
      status: "ok",
      bundle,
      thread: {
        _id: thread._id,
        userId: thread.userId,
        activityId: thread.activityId,
        status: thread.status,
        turnCount: thread.turnCount,
        cappedReason: thread.cappedReason ?? null,
      },
      history: turns.map((t) => ({
        seq: t.seq,
        role: t.role,
        content: t.content,
      })),
    };
  },
});

/**
 * Append a single user-role turn. Rejects (typed return) when the
 * thread is capped/closed. Returns the new turnCount so the orchestrator
 * can decide whether the next assistant reply is a normal continuation
 * (turnCount < 10) or the 10-turn organic-cap recap path
 * (turnCount === 10).
 *
 * Returns:
 *   { status: "ok", turnId, seq, turnCount }
 *   { status: "thread_closed", reason }
 */
export const appendUserTurn = internalMutation({
  args: {
    threadId: v.id("whispererThreads"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return { status: "thread_closed", reason: "not_found" };
    if (thread.status === "capped" || thread.status === "closed") {
      return {
        status: "thread_closed",
        reason: thread.status === "capped"
          ? (thread.cappedReason || "capped")
          : "closed",
      };
    }

    const now = Date.now();
    const seq = thread.turnCount;
    const turnId = await ctx.db.insert("whispererTurns", {
      threadId: args.threadId,
      seq,
      role: "user",
      content: args.content,
      modelUsed: "user",
      latencyMs: 0,
      createdAt: now,
    });
    await ctx.db.patch(args.threadId, {
      turnCount: seq + 1,
      lastTurnAt: now,
    });

    return { status: "ok", turnId, seq, turnCount: seq + 1 };
  },
});

/**
 * Finalize a normal (non-cap) continuation turn. Appends the assistant
 * turn and emits the two events U6 requires (whisperer_chat_expanded +
 * semantic_classify_scheduled) inside the same Convex transaction.
 *
 * Mirrors `finalizeRespond` but emits `whisperer_chat_expanded` instead
 * of `whisperer_invoked` and assumes the thread already exists (the
 * action created it via U4's first turn or U3's createThread).
 */
export const appendAssistantTurnForContinuation = internalMutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("whispererThreads"),
    activityId: v.id("activities"),
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
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.status !== "open") {
      throw new Error(`Cannot continue ${thread.status} thread`);
    }

    const now = Date.now();
    const seq = thread.turnCount;
    const turnId = await ctx.db.insert("whispererTurns", {
      threadId: args.threadId,
      seq,
      role: "assistant",
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

    await writePlanEvent(ctx, {
      userId: args.userId,
      eventType: "whisperer_chat_expanded",
      activityId: args.activityId,
      threadId: args.threadId,
      turnId,
      payload: args.invokedPayload,
    });
    await writePlanEvent(ctx, {
      userId: args.userId,
      eventType: "semantic_classify_scheduled",
      activityId: args.activityId,
      threadId: args.threadId,
      turnId,
      deliveryStatus: "pending",
    });

    return { threadId: args.threadId, turnId, seq };
  },
});

/**
 * Atomic recap-and-cap finisher. Used when:
 *   - the user-turn just hit turnCount===10 (organic 10-turn cap), or
 *   - the pre-flight cents reservation returned over_cents mid-thread.
 *
 * Marks the thread `capped` with the supplied reason, appends the
 * assistant recap turn, emits `whisperer_chat_capped`. All three
 * commit together so partial failures cannot leave a half-capped
 * thread on disk.
 */
export const markCappedAndAppendRecap = internalMutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("whispererThreads"),
    activityId: v.id("activities"),
    reason: v.union(
      v.literal("turn_limit"),
      v.literal("cents_ceiling")
    ),
    content: v.string(),
    modelUsed: v.string(),
    latencyMs: v.number(),
    tokenCounts: v.optional(
      v.object({ input: v.number(), output: v.number() })
    ),
    capPayload: v.any(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.status === "closed") {
      throw new Error("Cannot cap a closed thread");
    }

    // Flip to capped first so a racing appendTurn can't sneak in
    // between recap insertion and status flip.
    if (thread.status === "open") {
      await ctx.db.patch(args.threadId, {
        status: "capped",
        cappedReason: args.reason,
      });
    }

    // Recap turn is appended even on the capped thread — this insert
    // bypasses the appendTurn guard intentionally so the user always
    // sees a closing message.
    const now = Date.now();
    const reread = await ctx.db.get(args.threadId);
    const seq = reread.turnCount;
    const turnId = await ctx.db.insert("whispererTurns", {
      threadId: args.threadId,
      seq,
      role: "assistant",
      content: args.content,
      modelUsed: args.modelUsed,
      tokenCounts: args.tokenCounts,
      latencyMs: args.latencyMs,
      createdAt: now,
    });
    await ctx.db.patch(args.threadId, {
      turnCount: seq + 1,
      lastTurnAt: now,
    });

    await writePlanEvent(ctx, {
      userId: args.userId,
      eventType: "whisperer_chat_capped",
      activityId: args.activityId,
      threadId: args.threadId,
      turnId,
      payload: args.capPayload,
    });

    return { threadId: args.threadId, turnId, seq };
  },
});
