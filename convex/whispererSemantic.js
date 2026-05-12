"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  runSemanticClassifier,
  resolveSemanticEvents,
  computeFirstSeenWeek,
  defaultSemanticClassify,
} from "./lib/whispererSemantic.js";
import { OP_COSTS } from "./lib/rateLimit.js";
import { emitPlanEvent } from "./lib/planEventLog.js";

/**
 * U5 — Inline semantic classifier (fire-and-forget Haiku 2nd pass).
 *
 * Scheduled by U4 via `ctx.scheduler.runAfter(0, ...)` at the tail of
 * `whisperer.respond`. Its job is to emit semantic event rows into
 * `planEventLog` without ever disrupting the user-facing critical
 * path. Every failure mode is absorbed into a sentinel event so the
 * reconciliation cron (U8) can replay schedule -> outcome from the
 * event log alone.
 *
 * Sequence:
 *   1. Reserve `OP_COSTS.whisperer_semantic` (1¢) via the rate-limit
 *      envelope. On `over_cents`, emit `semantic_classify_failed` with
 *      `reason: "over_budget"` and return — do NOT throw.
 *   2. Load the turn + thread + activity + user role/phase + linked
 *      stakeholder name + the user's stakeholders list in ONE Convex
 *      transactional read.
 *   3. Call Haiku via the structured classifier with prompt-injection
 *      safe delimiters. Retry once on parse/provider error.
 *   4. Resolve `stakeholder_referenced` labels against the user's
 *      stakeholders table — drop labels whose extracted name does not
 *      match a real row.
 *   5. Emit each surviving label as its own `planEventLog` row in a
 *      single transactional batch via `internal.whispererInternal
 *      .emitSemanticEvents`. When the run produces zero labels, emit
 *      the `semantic_classify_completed_empty` sentinel instead.
 *   6. On retry-then-failure emit `semantic_classify_failed` with
 *      `payload.error_type`.
 */
export const classifyTurnSemantic = internalAction({
  args: {
    turnId: v.id("whispererTurns"),
    threadId: v.id("whispererThreads"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // ── 1) Budget reservation ────────────────────────────────────────
    // We want the structured envelope (not a thrown error) so an
    // over-budget user still gets a breadcrumb in the event log
    // without disrupting the U4 response.
    const reservation = await ctx.runMutation(
      internal.whispererInternal.reserveWhispererBudget,
      {
        userId: args.userId,
        op: "whisperer_semantic",
        estimatedCents: OP_COSTS.whisperer_semantic,
      }
    );
    if (reservation.status !== "ok") {
      await emitPlanEvent(ctx, {
        userId: args.userId,
        eventType: "semantic_classify_failed",
        threadId: args.threadId,
        turnId: args.turnId,
        payload: {
          error_type: "over_budget",
          reservation_status: reservation.status,
          model_used: "claude-haiku",
        },
      });
      return null;
    }

    // ── 2) Load turn + context ───────────────────────────────────────
    const loaded = await ctx.runQuery(
      internal.whispererInternal.loadTurnAndContext,
      { turnId: args.turnId }
    );
    if (!loaded) {
      // The turn vanished between schedule and run (cascade delete,
      // etc.) — there's nothing to attach an event to. Emit a failure
      // sentinel keyed by the original turnId so reconciliation can
      // still close the loop.
      await emitPlanEvent(ctx, {
        userId: args.userId,
        eventType: "semantic_classify_failed",
        threadId: args.threadId,
        turnId: args.turnId,
        payload: {
          error_type: "turn_missing",
          model_used: "claude-haiku",
        },
      });
      return null;
    }

    const activityId = loaded.thread.activityId;

    // ── 3) Run classifier with one retry ────────────────────────────
    // Strict-mode `args.content` is what U4 passed in; we prefer it
    // over the turn-record content so the classifier sees the exact
    // bytes the model that produced the turn saw. (They should match,
    // but content normalisation in finalizeRespond means we belt-and-
    // brace here.)
    const run = await runSemanticClassifier({
      content: args.content,
      role: loaded.user.role || undefined,
      phase: loaded.user.phaseName || undefined,
      stakeholderName: loaded.linkedStakeholderName || undefined,
      classify: defaultSemanticClassify,
    });

    if (run.kind === "failed") {
      await emitPlanEvent(ctx, {
        userId: args.userId,
        eventType: "semantic_classify_failed",
        activityId,
        threadId: args.threadId,
        turnId: args.turnId,
        payload: {
          error_type: run.errorType,
          model_used: "claude-haiku",
        },
      });
      return null;
    }

    // ── 4) Resolve stakeholders + build emission payloads ───────────
    const resolved = resolveSemanticEvents(run.events, loaded.stakeholders);

    if (resolved.length === 0) {
      await emitPlanEvent(ctx, {
        userId: args.userId,
        eventType: "semantic_classify_completed_empty",
        activityId,
        threadId: args.threadId,
        turnId: args.turnId,
        payload: {
          model_used: "claude-haiku",
          raw_label_count: Array.isArray(run.events) ? run.events.length : 0,
        },
      });
      return null;
    }

    const events = resolved.map((ev) => {
      const payload = {
        model_used: "claude-haiku",
      };
      if (ev.evidence) payload.evidence = ev.evidence;
      let firstSeenWeek;
      if (ev.type === "stakeholder_referenced") {
        payload.stakeholder_id = ev.stakeholderId;
        if (ev.stakeholderName) payload.stakeholder_name = ev.stakeholderName;
        firstSeenWeek = computeFirstSeenWeek(
          loaded.user.startDate,
          ev.firstMentionedAt
        );
      }
      return {
        eventType: ev.type,
        payload,
        firstSeenWeek,
      };
    });

    // ── 5) Atomic batch write ───────────────────────────────────────
    await ctx.runMutation(internal.whispererInternal.emitSemanticEvents, {
      userId: args.userId,
      activityId,
      threadId: args.threadId,
      turnId: args.turnId,
      events,
    });

    return null;
  },
});
