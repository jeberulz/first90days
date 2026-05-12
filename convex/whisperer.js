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
  stakeholderFactsForValidation,
  COACHING_MAX_CHARS,
  COACHING_MIN_CHARS,
  ARTIFACT_MIN_CHARS,
  SMALL_TASK_MAX_CHARS,
} from "./lib/whispererPrompts.js";
import { classifyTask } from "./lib/whispererClassifier.js";
import { validateResponse } from "./lib/whispererValidator.js";

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

    // PII validator hit → retry once strict. Second hit → regenerate
    // full with strict prompt. Third hit → graceful envelope.
    if (attempt.kind === "pii_hit") {
      piiRetry = true;
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
      if (attempt.kind === "pii_hit" || attempt.kind === "parse_failed") {
        attempt = await callAndValidate({
          bundle,
          buildPrompt,
          strict: true,
          stakeholderFacts,
          path,
        });
        if (
          attempt.kind === "provider_unavailable" ||
          attempt.kind === "pii_hit" ||
          attempt.kind === "parse_failed"
        ) {
          return {
            status: "provider_unavailable",
            reason: "Couldn't ground the response safely — try rephrasing the task.",
          };
        }
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
