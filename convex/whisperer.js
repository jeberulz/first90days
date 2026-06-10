"use node";

import { v } from "convex/values";
import { action } from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import {
  generateStructured,
  generateText,
  CLAUDE_SONNET_MODEL,
} from "./lib/ai.js";
import {
  HYBRID_RESPONSE_SCHEMA,
  WHISPERER_SYSTEM_PROMPT,
  buildHybridPrompt,
  buildClarifyingPrompt,
  buildSmallTaskPrompt,
  buildContinuationPrompt,
  buildCapRecapPrompt,
  stakeholderFactsForValidation,
  COACHING_MAX_CHARS,
  COACHING_MIN_CHARS,
  ARTIFACT_MIN_CHARS,
  SMALL_TASK_MAX_CHARS,
} from "./lib/whispererPrompts.js";
import { classifyTask } from "./lib/whispererClassifier.js";
import { validateResponse } from "./lib/whispererValidator.js";
import { buildEscalationCopyText } from "./lib/whispererEscalation.js";

/**
 * Public whisperer action (U4).
 *
 * Orchestration only — every DB read/write happens inside the small
 * internal mutations/query in convex/whispererInternal.js so this Node
 * action stays transactional-where-it-matters and free of DB access.
 *
 * Return shape is a typed envelope. Callers (U7 UI) never receive a
 * raw stack trace; every failure mode maps to one of the `status`
 * values below.
 *
 *   { status: "ok", path: "hybrid"|"small"|"clarify",
 *     coachingSummary?, artifact?, assumptions?, clarifyingQuestion?,
 *     threadId, turnId, classifier, cappedReason? }
 *   { status: "over_count" | "over_cents", remaining_cost, remaining_whisperer_calls_est }
 *   { status: "provider_unavailable", reason }
 *   { status: "unauthorized" }
 *   { status: "not_found" }
 */
export const respond = action({
  args: {
    activityId: v.id("activities"),
    force_full: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authUserId = await ctx.runQuery(
      api.planMutations.getAuthenticatedUserId,
      {}
    );
    if (!authUserId) return { status: "unauthorized" };

    const loaded = await ctx.runQuery(
      internal.whispererInternal.loadContextBundle,
      { userId: authUserId, activityId: args.activityId }
    );
    if (loaded.status !== "ok") {
      // unauthorized | not_found | provider_unavailable
      return { status: loaded.status };
    }
    const bundle = loaded.bundle;
    const task = bundle.task;

    const classifier = classifyTask(task, bundle);
    const forcedFull = args.force_full === true;
    const path =
      forcedFull || classifier.size === "full"
        ? classifier.shape === "clarify"
          ? "clarify"
          : "hybrid"
        : "small";

    // ── Budget reservation ───────────────────────────────────────────
    const reservation = await ctx.runMutation(
      internal.whispererInternal.reserveWhispererBudget,
      { userId: authUserId, op: "whisperer" }
    );
    if (reservation.status !== "ok") {
      return reservation;
    }

    const t0 = Date.now();
    const stakeholderFacts = stakeholderFactsForValidation(bundle);

    // ── Path: small task ─────────────────────────────────────────────
    if (path === "small") {
      const userPrompt = buildSmallTaskPrompt(bundle);
      let small;
      try {
        small = await generateText(WHISPERER_SYSTEM_PROMPT, userPrompt);
      } catch (err) {
        return providerUnavailable(err);
      }
      const trimmed = String(small || "").trim().slice(0, SMALL_TASK_MAX_CHARS);
      const finalized = await ctx.runMutation(
        internal.whispererInternal.finalizeRespond,
        {
          userId: authUserId,
          activityId: args.activityId,
          role: "assistant",
          content: trimmed,
          modelUsed: CLAUDE_SONNET_MODEL,
          latencyMs: Date.now() - t0,
          invokedPayload: {
            classifier_decision: classifier,
            forced_full: forcedFull,
            model_used: CLAUDE_SONNET_MODEL,
            path: "small",
            pii_retry: false,
            timed_out: false,
          },
        }
      );
      await scheduleSemantic(ctx, {
        ...finalized,
        userId: authUserId,
        content: trimmed,
      });
      return {
        status: "ok",
        path: "small",
        coachingSummary: trimmed,
        threadId: finalized.threadId,
        turnId: finalized.turnId,
        classifier,
      };
    }

    // ── Path: clarifying / hybrid via generateStructured ─────────────
    const buildPrompt = (strict) => {
      if (path === "clarify") return buildClarifyingPrompt(bundle, { strict });
      return buildHybridPrompt(bundle, classifier.shape, { strict });
    };

    // First attempt
    let attempt = await callAndValidate({
      bundle,
      buildPrompt,
      strict: false,
      stakeholderFacts,
      path,
    });
    let piiRetry = false;

    if (attempt.kind === "provider_unavailable") {
      return providerUnavailable(attempt.error);
    }

    // Parse/semantic-check failure → one stricter retry (no extra reservation).
    if (attempt.kind === "parse_failed") {
      attempt = await callAndValidate({
        bundle,
        buildPrompt,
        strict: true,
        stakeholderFacts,
        path,
      });
      if (attempt.kind === "provider_unavailable") {
        return providerUnavailable(attempt.error);
      }
      if (attempt.kind === "parse_failed") {
        return providerUnavailable(new Error("structured_output_invalid"));
      }
    }

    // PII validator hit → ONE strict retry. If the retry still hits,
    // fail-open: ship the response with a pii_warning flag rather than
    // hide a working response behind a sterile error. The Haiku judge
    // is a soft signal, not a hard gate — empirically (2026-05-12) the
    // hard-gate flow degraded UX worse than any false negative could.
    // The warning is captured in the invokedPayload so telemetry can
    // monitor false-positive rates.
    let piiWarning = false;
    let firstHit = null;
    if (attempt.kind === "pii_hit") {
      firstHit = attempt;
      piiRetry = true;
      const retry = await callAndValidate({
        bundle,
        buildPrompt,
        strict: true,
        stakeholderFacts,
        path,
      });
      if (retry.kind === "ok") {
        attempt = retry;
      } else if (retry.kind === "provider_unavailable") {
        return providerUnavailable(retry.error);
      } else {
        // Retry still failed. Ship the FIRST attempt's parsed output
        // (Sonnet's best shot, before strict-mode pushed it elsewhere).
        attempt = { kind: "ok", parsed: firstHit.parsed, tokenCounts: undefined };
        piiWarning = true;
      }
    }

    // attempt.kind === "ok" — finalize.
    const parsed = attempt.parsed;
    const content = parsed.coaching_summary || "";
    const finalized = await ctx.runMutation(
      internal.whispererInternal.finalizeRespond,
      {
        userId: authUserId,
        activityId: args.activityId,
        role: "assistant",
        content,
        modelUsed: CLAUDE_SONNET_MODEL,
        latencyMs: Date.now() - t0,
        assumptions: parsed.assumptions || [],
        artifact: emptyToUndefined(parsed.artifact),
        clarifyingQuestion: emptyToUndefined(parsed.clarifying_question),
        tokenCounts: attempt.tokenCounts,
        invokedPayload: {
          classifier_decision: classifier,
          forced_full: forcedFull,
          model_used: CLAUDE_SONNET_MODEL,
          path,
          pii_retry: piiRetry,
          pii_warning: piiWarning,
          timed_out: false,
        },
      }
    );

    await scheduleSemantic(ctx, {
      ...finalized,
      userId: authUserId,
      content,
    });

    return {
      status: "ok",
      path,
      coachingSummary: content,
      artifact: emptyToUndefined(parsed.artifact),
      assumptions: parsed.assumptions || [],
      clarifyingQuestion: emptyToUndefined(parsed.clarifying_question),
      threadId: finalized.threadId,
      turnId: finalized.turnId,
      classifier,
    };
  },
});

/**
 * One LLM call + parse + semantic post-checks + PII validation.
 *
 * Returns one of:
 *   { kind: "ok", parsed, tokenCounts? }
 *   { kind: "parse_failed", reason }
 *   { kind: "pii_hit", verdict, parsed }
 *   { kind: "provider_unavailable", error }
 */
async function callAndValidate({
  bundle,
  buildPrompt,
  strict,
  stakeholderFacts,
  path,
}) {
  let result;
  try {
    result = await generateStructured(
      WHISPERER_SYSTEM_PROMPT,
      buildPrompt(strict),
      HYBRID_RESPONSE_SCHEMA
    );
  } catch (err) {
    return { kind: "provider_unavailable", error: err };
  }

  const parsed = result && result.json;
  const semantic = checkSemantic(parsed, path);
  if (!semantic.ok) {
    return { kind: "parse_failed", reason: semantic.reason };
  }

  const verdict = await validateResponse(parsed, stakeholderFacts);
  if (!verdict.ok) {
    return { kind: "pii_hit", verdict, parsed };
  }

  return { kind: "ok", parsed, tokenCounts: result.tokens };
}

/**
 * Schema-and-grammar checks that the LLM frequently violates even with
 * structured-output enforcement. Keeps the orchestrator's retry
 * decision explainable.
 */
function checkSemantic(parsed, path) {
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "non_object" };
  }
  const cs = String(parsed.coaching_summary || "");
  const art = String(parsed.artifact || "");
  const cq = String(parsed.clarifying_question || "");

  if (path === "clarify") {
    if (!cq.trim()) return { ok: false, reason: "missing_clarifying_question" };
    if (!cq.trim().endsWith("?"))
      return { ok: false, reason: "clarifying_no_qmark" };
    return { ok: true };
  }

  if (cs.length < COACHING_MIN_CHARS) {
    return { ok: false, reason: "coaching_too_short" };
  }
  if (cs.length > COACHING_MAX_CHARS) {
    return { ok: false, reason: "coaching_too_long" };
  }
  if (path === "hybrid") {
    // shape='artifact' carries a required artifact field. We can't
    // tell shape here cheaply, so we only enforce the floor when an
    // artifact was produced.
    if (art && art.length < ARTIFACT_MIN_CHARS) {
      return { ok: false, reason: "artifact_too_short" };
    }
  }
  return { ok: true };
}

async function scheduleSemantic(ctx, { threadId, turnId, userId, content }) {
  // U5 stub today; U5 PR replaces the body. Scheduling at 0s = fire
  // immediately on the next tick without blocking the response.
  await ctx.scheduler.runAfter(
    0,
    internal.whispererSemantic.classifyTurnSemantic,
    { turnId, threadId, userId, content }
  );
}

function providerUnavailable(err) {
  return {
    status: "provider_unavailable",
    reason:
      err && err.message ? String(err.message).slice(0, 200) : "ai_provider_error",
  };
}

function emptyToUndefined(s) {
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t.length === 0 ? undefined : t;
}

const ORGANIC_TURN_CAP = 10;
const CAP_OPTIONS = [
  { key: "mark_task_done", label: "Mark task done" },
  { key: "escalate_to_manager", label: "Escalate to manager" },
  { key: "close_unresolved", label: "Close unresolved" },
];

const FALLBACK_RECAP_TURN_LIMIT =
  "This conversation has reached the daily ritual cap. Pick the next step that fits — mark the task done, escalate it, or close it unresolved.";
const FALLBACK_RECAP_CENTS =
  "You've used a lot of AI today, so I'm pausing this thread. Mark the task done, escalate it, or close it unresolved — more capacity opens up tomorrow.";

/**
 * Public whisperer chat-continuation action (U6).
 *
 * Soft-block state machine:
 *   1. Auth: continueThread only loads threads owned by the caller.
 *   2. Pre-flight reservation. `over_cents` mid-thread → graceful
 *      cap-recap path (NOT a hard error).
 *   3. Capped/closed thread → typed `thread_closed`.
 *   4. Append user turn. The post-append turnCount drives routing:
 *        - turnCount === 10 → organic 10-turn cap, zero-cost recap.
 *        - turnCount  <  10 → normal continuation, same hybrid schema
 *          as U4, semantic classifier scheduled.
 *
 * Return envelope:
 *   { status: "ok", path: "continuation", coachingSummary, artifact?,
 *     assumptions, threadId, turnId, capped: false }
 *   { status: "ok", path: "recap", recap, capped: true,
 *     cents_capped?: true, options: [...], escalate?, threadId, turnId }
 *   { status: "over_count" | "over_cents", remaining_cost, ... }
 *   { status: "thread_closed", reason }
 *   { status: "provider_unavailable", reason }
 *   { status: "unauthorized" } | { status: "not_found" }
 */
export const continueThread = action({
  args: {
    threadId: v.id("whispererThreads"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await ctx.runQuery(
      api.planMutations.getAuthenticatedUserId,
      {}
    );
    if (!authUserId) return { status: "unauthorized" };

    const message = String(args.message || "").trim();
    if (message.length === 0) {
      return {
        status: "provider_unavailable",
        reason: "Empty message — type a follow-up to continue the thread.",
      };
    }
    // Cap inbound length: protects storage and the model token budget when
    // the UI's textarea limit is bypassed.
    if (message.length > 4000) {
      return {
        status: "provider_unavailable",
        reason: "Message is too long — keep follow-ups under 4,000 characters.",
      };
    }

    // ── Load thread + bundle + history (transactional read) ──────────
    const loaded = await ctx.runQuery(
      internal.whispererInternal.loadThreadAndBundle,
      { userId: authUserId, threadId: args.threadId }
    );
    if (loaded.status !== "ok") {
      return { status: loaded.status };
    }
    const { bundle, thread, history } = loaded;

    if (thread.status === "capped" || thread.status === "closed") {
      return {
        status: "thread_closed",
        reason:
          thread.status === "capped"
            ? (thread.cappedReason || "capped")
            : "closed",
      };
    }

    // ── Pre-flight budget reservation (mid-thread aware) ─────────────
    const reservation = await ctx.runMutation(
      internal.whispererInternal.reserveWhispererBudget,
      { userId: authUserId, op: "whisperer", midThread: true }
    );

    // `over_count` mid-thread is still a hard quota hit. `over_cents`
    // is the special graceful path.
    if (reservation.status === "over_count") {
      return reservation;
    }
    if (reservation.status === "over_cents") {
      return await runCapRecap({
        ctx,
        userId: authUserId,
        thread,
        bundle,
        history,
        reason: "cents_ceiling",
        // We do NOT append the user's message in the cents-capped path:
        // the reservation refused them BEFORE the turn landed. The
        // recap acts as the assistant's closing reply and the thread
        // flips to capped without ever recording the failed user turn.
        appendUserMessage: null,
        reservationEnvelope: reservation,
      });
    }
    // reservation.status === "ok"

    // ── Append the user turn (transactional, rejects on capped/closed) ──
    const userAppend = await ctx.runMutation(
      internal.whispererInternal.appendUserTurn,
      { threadId: args.threadId, content: message }
    );
    if (userAppend.status !== "ok") {
      // Raced with another flow that capped the thread between the
      // read above and this write. Same `thread_closed` envelope.
      return {
        status: "thread_closed",
        reason: userAppend.reason || "capped",
      };
    }

    const newTurnCount = userAppend.turnCount;

    // History at the moment of the assistant turn includes the new
    // user message (we just appended it).
    const historyWithUser = [
      ...history,
      { role: "user", content: message },
    ];

    // ── Organic 10-turn cap → recap path ─────────────────────────────
    if (newTurnCount >= ORGANIC_TURN_CAP) {
      return await runCapRecap({
        ctx,
        userId: authUserId,
        thread,
        bundle,
        history: historyWithUser,
        reason: "turn_limit",
        appendUserMessage: null, // already appended above
        reservationEnvelope: reservation,
      });
    }

    // ── Normal continuation turn ────────────────────────────────────
    const stakeholderFacts = stakeholderFactsForValidation(bundle);
    const shape = "coaching"; // continuation defaults to coaching shape
    const buildPrompt = (strict) =>
      buildContinuationPrompt(bundle, historyWithUser, shape, { strict });

    const t0 = Date.now();
    let attempt = await callAndValidate({
      bundle,
      buildPrompt,
      strict: false,
      stakeholderFacts,
      path: "hybrid",
    });
    let piiRetry = false;

    if (attempt.kind === "provider_unavailable") {
      return providerUnavailable(attempt.error);
    }
    if (attempt.kind === "parse_failed") {
      attempt = await callAndValidate({
        bundle,
        buildPrompt,
        strict: true,
        stakeholderFacts,
        path: "hybrid",
      });
      if (attempt.kind === "provider_unavailable") {
        return providerUnavailable(attempt.error);
      }
      if (attempt.kind === "parse_failed") {
        return providerUnavailable(new Error("structured_output_invalid"));
      }
    }
    if (attempt.kind === "pii_hit") {
      piiRetry = true;
      attempt = await callAndValidate({
        bundle,
        buildPrompt,
        strict: true,
        stakeholderFacts,
        path: "hybrid",
      });
      if (attempt.kind === "provider_unavailable") {
        return providerUnavailable(attempt.error);
      }
      if (attempt.kind === "pii_hit" || attempt.kind === "parse_failed") {
        attempt = await callAndValidate({
          bundle,
          buildPrompt,
          strict: true,
          stakeholderFacts,
          path: "hybrid",
        });
        if (
          attempt.kind === "provider_unavailable" ||
          attempt.kind === "pii_hit" ||
          attempt.kind === "parse_failed"
        ) {
          return {
            status: "provider_unavailable",
            reason:
              "Couldn't ground the response safely — try rephrasing the message.",
          };
        }
      }
    }

    const parsed = attempt.parsed;
    const content = parsed.coaching_summary || "";

    const finalized = await ctx.runMutation(
      internal.whispererInternal.appendAssistantTurnForContinuation,
      {
        userId: authUserId,
        threadId: args.threadId,
        activityId: thread.activityId,
        content,
        modelUsed: CLAUDE_SONNET_MODEL,
        latencyMs: Date.now() - t0,
        assumptions: parsed.assumptions || [],
        artifact: emptyToUndefined(parsed.artifact),
        clarifyingQuestion: emptyToUndefined(parsed.clarifying_question),
        tokenCounts: attempt.tokenCounts,
        invokedPayload: {
          model_used: CLAUDE_SONNET_MODEL,
          path: "continuation",
          turn_index: newTurnCount, // 0-indexed seq of the assistant turn
          pii_retry: piiRetry,
          timed_out: false,
        },
      }
    );

    await scheduleSemantic(ctx, {
      threadId: finalized.threadId,
      turnId: finalized.turnId,
      userId: authUserId,
      content,
    });

    return {
      status: "ok",
      path: "continuation",
      coachingSummary: content,
      artifact: emptyToUndefined(parsed.artifact),
      assumptions: parsed.assumptions || [],
      clarifyingQuestion: emptyToUndefined(parsed.clarifying_question),
      threadId: finalized.threadId,
      turnId: finalized.turnId,
      turnCount: newTurnCount + 1, // include the assistant turn just appended
      capped: false,
      remaining_cost: reservation.remaining_cost,
      remaining_whisperer_calls_est:
        reservation.remaining_whisperer_calls_est,
    };
  },
});

/**
 * Recap-and-cap helper. Reused by the organic-cap and cents-cap paths.
 *
 * Returns the user-facing envelope.
 */
async function runCapRecap({
  ctx,
  userId,
  thread,
  bundle,
  history,
  reason,
  reservationEnvelope,
}) {
  const t0 = Date.now();
  const prompt = buildCapRecapPrompt(bundle, history, reason);

  let recapText = "";
  let tokenCounts;
  try {
    const out = await generateText(WHISPERER_SYSTEM_PROMPT, prompt);
    recapText = String(out || "").trim();
  } catch (err) {
    recapText = "";
  }
  if (!recapText) {
    recapText =
      reason === "cents_ceiling"
        ? FALLBACK_RECAP_CENTS
        : FALLBACK_RECAP_TURN_LIMIT;
  }

  const capped = await ctx.runMutation(
    internal.whispererInternal.markCappedAndAppendRecap,
    {
      userId,
      threadId: thread._id,
      activityId: thread.activityId,
      reason,
      content: recapText,
      modelUsed: CLAUDE_SONNET_MODEL,
      latencyMs: Date.now() - t0,
      tokenCounts,
      capPayload: {
        cap_reached: ORGANIC_TURN_CAP,
        reason,
        model_used: CLAUDE_SONNET_MODEL,
      },
    }
  );

  const escalate = buildEscalationCopyText({
    taskTitle: bundle.task?.title,
    taskDescription: bundle.task?.description,
    stakeholderRole: bundle.linkedStakeholder?.role,
    stakeholderName: bundle.linkedStakeholder?.name,
    recapText,
  });

  const envelope = {
    status: "ok",
    path: "recap",
    recap: recapText,
    threadId: capped.threadId,
    turnId: capped.turnId,
    capped: true,
    cappedReason: reason,
    options: CAP_OPTIONS,
    escalate,
  };
  if (reason === "cents_ceiling") {
    envelope.cents_capped = true;
    if (reservationEnvelope) {
      envelope.remaining_cost = reservationEnvelope.remaining_cost;
      envelope.remaining_whisperer_calls_est =
        reservationEnvelope.remaining_whisperer_calls_est;
      envelope.tier = reservationEnvelope.tier;
    }
  }
  return envelope;
}
