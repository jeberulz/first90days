/**
 * Whisperer telemetry surface (U8).
 *
 * Provides:
 *   - Public mutations for accept / edit / discard signals from the UI
 *     (markAccepted, markEdited, markDiscarded). Each is auth-checked
 *     by joining turn → thread → userId.
 *   - An internal helper used by activities.complete to emit the
 *     task_complete-path acceptance when a task transitions to done
 *     within 24h of any whisperer turn.
 *   - The daily reconciliation cron that catches dropped semantic
 *     classifications (see R15 + the adversarial scheduler-failure
 *     finding in the plan).
 *
 * De-duplication invariant: at most ONE `whisperer_accepted` row per
 * turnId, regardless of which path (copy / edit / task_complete)
 * fired first. The first signal wins; subsequent signals are no-ops
 * with their path appended to the original row's payload.dedup_paths.
 */

import { v } from "convex/values";
import {
  mutation,
  internalMutation,
  internalAction,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { writePlanEvent } from "./lib/planEventLog";

const TASK_COMPLETE_WINDOW_MS = 24 * 60 * 60 * 1000;

async function resolveTurnOwnership(ctx, turnId, userId) {
  const turn = await ctx.db.get(turnId);
  if (!turn) return { ok: false, reason: "turn_not_found" };
  const thread = await ctx.db.get(turn.threadId);
  if (!thread || thread.userId !== userId) {
    return { ok: false, reason: "unauthorized" };
  }
  return { ok: true, turn, thread };
}

async function findExistingAccept(ctx, userId, turnId) {
  return await ctx.db
    .query("planEventLog")
    .withIndex("by_user_event", (q) =>
      q.eq("userId", userId).eq("eventType", "whisperer_accepted")
    )
    .filter((q) => q.eq(q.field("turnId"), turnId))
    .first();
}

/**
 * Acceptance signal. Path values:
 *   - "copy"          — user copied the artifact to clipboard.
 *   - "edit"          — user opened the edit affordance (v2 surface;
 *                       v1 reserves the value but doesn't fire it yet).
 *   - "task_complete" — emitted by the internal helper below when the
 *                       activity transitions to complete within 24h.
 *
 * Idempotent: the first signal lands a row, subsequent signals append
 * to that row's payload.dedup_paths so analytics can still see all
 * signals without inflating the north-star metric.
 */
export const markAccepted = mutation({
  args: {
    turnId: v.id("whispererTurns"),
    path: v.union(
      v.literal("copy"),
      v.literal("edit"),
      v.literal("task_complete")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const ownership = await resolveTurnOwnership(ctx, args.turnId, userId);
    if (!ownership.ok) throw new Error(ownership.reason);

    const existing = await findExistingAccept(ctx, userId, args.turnId);
    if (existing) {
      const dedup = Array.isArray(existing.payload?.dedup_paths)
        ? existing.payload.dedup_paths
        : [];
      if (dedup.includes(args.path)) return existing._id;
      await ctx.db.patch(existing._id, {
        payload: {
          ...(existing.payload || {}),
          dedup_paths: [...dedup, args.path],
        },
      });
      return existing._id;
    }

    return await writePlanEvent(ctx, {
      userId,
      eventType: "whisperer_accepted",
      activityId: ownership.thread.activityId,
      threadId: ownership.turn.threadId,
      turnId: args.turnId,
      payload: { path: args.path },
    });
  },
});

/**
 * Edit signal — emitted when the user opens the artifact edit
 * affordance. v1 has no edit affordance (the UI only ships a copy
 * button), but the mutation is wired so v2 can call it without a
 * schema change. Triggers an acceptance too via the "edit" path.
 */
export const markEdited = mutation({
  args: { turnId: v.id("whispererTurns") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const ownership = await resolveTurnOwnership(ctx, args.turnId, userId);
    if (!ownership.ok) throw new Error(ownership.reason);

    await writePlanEvent(ctx, {
      userId,
      eventType: "whisperer_edited",
      activityId: ownership.thread.activityId,
      threadId: ownership.turn.threadId,
      turnId: args.turnId,
    });

    // Edit also counts as an acceptance signal per the U8 metric spec.
    const existing = await findExistingAccept(ctx, userId, args.turnId);
    if (!existing) {
      await writePlanEvent(ctx, {
        userId,
        eventType: "whisperer_accepted",
        activityId: ownership.thread.activityId,
        threadId: ownership.turn.threadId,
        turnId: args.turnId,
        payload: { path: "edit" },
      });
    }
    return null;
  },
});

/**
 * Discard signal — emitted when the user closes the whisperer
 * response without copying. Distinct from "edited" or "accepted":
 * this is the explicit negative signal that lets analytics measure
 * how often the response misses.
 */
export const markDiscarded = mutation({
  args: { turnId: v.id("whispererTurns") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const ownership = await resolveTurnOwnership(ctx, args.turnId, userId);
    if (!ownership.ok) throw new Error(ownership.reason);

    // De-dup with prior accept: never emit a discard for a turn that
    // already has an acceptance row.
    const existingAccept = await findExistingAccept(ctx, userId, args.turnId);
    if (existingAccept) return null;

    return await writePlanEvent(ctx, {
      userId,
      eventType: "whisperer_discarded",
      activityId: ownership.thread.activityId,
      threadId: ownership.turn.threadId,
      turnId: args.turnId,
    });
  },
});

/**
 * Helper called inline from activities.complete. Looks up the most
 * recent whisperer turn on the activity; if it's within 24h, emits
 * `whisperer_accepted` with `path: "task_complete"` (subject to the
 * same dedup invariant as the public mutation).
 *
 * Soft-fails on every error path — telemetry should NEVER block the
 * user's task-complete write. Exported as a plain helper (not an
 * internalMutation) because Convex mutations cannot call
 * `ctx.runMutation` on each other; instead they share helpers
 * directly under the same transaction.
 */
export async function emitTaskCompleteAcceptIfRecent(ctx, args) {
  try {
    // After the multi-thread-per-activity change (user-initiated
    // "start fresh"), exclude closed threads. A user who explicitly
    // discarded their conversation has already emitted
    // whisperer_discarded — don't subsequently emit
    // whisperer_accepted on the same turn just because the task
    // happened to complete within 24h.
    const thread = await ctx.db
      .query("whispererThreads")
      .withIndex("by_user_activity", (q) =>
        q.eq("userId", args.userId).eq("activityId", args.activityId)
      )
      .filter((q) => q.neq(q.field("status"), "closed"))
      .order("desc")
      .first();
    if (!thread) return null;

    const turns = await ctx.db
      .query("whispererTurns")
      .withIndex("by_thread_seq", (q) => q.eq("threadId", thread._id))
      .collect();
    const lastAssistant = [...turns]
      .reverse()
      .find((t) => t.role === "assistant");
    if (!lastAssistant) return null;

    if (args.completedAt - lastAssistant.createdAt > TASK_COMPLETE_WINDOW_MS) {
      return null;
    }

    const existing = await findExistingAccept(ctx, args.userId, lastAssistant._id);
    if (existing) {
      const dedup = Array.isArray(existing.payload?.dedup_paths)
        ? existing.payload.dedup_paths
        : [];
      if (dedup.includes("task_complete")) return existing._id;
      await ctx.db.patch(existing._id, {
        payload: {
          ...(existing.payload || {}),
          dedup_paths: [...dedup, "task_complete"],
        },
      });
      return existing._id;
    }

    return await writePlanEvent(ctx, {
      userId: args.userId,
      eventType: "whisperer_accepted",
      activityId: args.activityId,
      threadId: thread._id,
      turnId: lastAssistant._id,
      payload: { path: "task_complete" },
    });
  } catch {
    // Telemetry must never block user writes.
    return null;
  }
}

/**
 * Daily reconciliation: for every `whisperer_invoked` /
 * `whisperer_chat_expanded` from the prior 24h, verify there is at
 * least one corresponding semantic event for the same turnId — either
 * a semantic label, `semantic_classify_completed_empty`, or
 * `semantic_classify_failed`. If none exists, emit
 * `semantic_classify_failed` with `recovered_by_reconciliation: true`
 * so the gap is visible in analytics.
 */
export const reconcileWhispererSemanticEvents = internalAction({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.runMutation(
      internal.whispererTelemetry.runReconciliationBatch,
      {}
    );
    return stats;
  },
});

const SEMANTIC_EVENT_TYPES = new Set([
  "stuck_signaled",
  "blocker_named",
  "stakeholder_referenced",
  "task_reframed",
  "commitment_made",
  "semantic_classify_completed_empty",
  "semantic_classify_failed",
]);

/**
 * Transactional batch for the reconciliation cron. Kept as an
 * internal mutation so the scan + emit happen in one Convex
 * transaction.
 */
export const runReconciliationBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const windowStart = now - 24 * 60 * 60 * 1000;

    const candidates = await ctx.db
      .query("planEventLog")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("eventType"), "whisperer_invoked"),
            q.eq(q.field("eventType"), "whisperer_chat_expanded")
          ),
          q.gte(q.field("createdAt"), windowStart),
          q.lte(q.field("createdAt"), now)
        )
      )
      .take(500);

    let scanned = 0;
    let recovered = 0;
    for (const row of candidates) {
      scanned++;
      if (!row.turnId) continue;

      const related = await ctx.db
        .query("planEventLog")
        .withIndex("by_thread", (q) => q.eq("threadId", row.threadId))
        .collect();
      const hasSemantic = related.some(
        (e) => e.turnId === row.turnId && SEMANTIC_EVENT_TYPES.has(e.eventType)
      );
      if (hasSemantic) continue;

      await writePlanEvent(ctx, {
        userId: row.userId,
        eventType: "semantic_classify_failed",
        activityId: row.activityId,
        threadId: row.threadId,
        turnId: row.turnId,
        payload: {
          error_type: "missing_semantic_classification",
          recovered_by_reconciliation: true,
          source_event: row.eventType,
        },
        deliveryStatus: "failed",
      });
      recovered++;
    }

    return { scanned, recovered };
  },
});

/**
 * Public read-only query exposing the north-star acceptance rate over
 * the last N days. Available for in-app dashboards; the same data
 * underlies the analytics pipeline.
 */
export const northStarAcceptanceRate = query({
  args: { sinceDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const sinceDays = args.sinceDays ?? 7;
    const since = Date.now() - sinceDays * 24 * 60 * 60 * 1000;

    const rows = await ctx.db
      .query("planEventLog")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", userId).gte("createdAt", since)
      )
      .collect();

    const invoked = rows.filter((r) => r.eventType === "whisperer_invoked").length;
    const accepted = rows.filter((r) => r.eventType === "whisperer_accepted").length;
    const discarded = rows.filter((r) => r.eventType === "whisperer_discarded").length;
    return {
      sinceDays,
      invoked,
      accepted,
      discarded,
      acceptanceRate: invoked === 0 ? null : accepted / invoked,
    };
  },
});
