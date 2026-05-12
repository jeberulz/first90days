/**
 * Whisperer PII / fact-fabrication validator (U4).
 *
 * Uses Claude Haiku as a small structured judge against the EXACT
 * stakeholder facts surfaced in the prompt's context bundle (not regex
 * — regex flags too many false positives on legitimate role labels).
 *
 * Validator output schema:
 *   { ok: boolean, reason?: string, fabricated?: string[] }
 *
 * `ok: true` → response is grounded. `ok: false` → at least one
 * stakeholder fact was invented or hallucinated; `fabricated` lists
 * the offending fragments so the orchestrator can surface them to
 * telemetry and tune the strict-retry prompt.
 *
 * Pure helper aside from a passed-in `judge` callback so this file is
 * trivially testable with a fake judge that doesn't hit the network.
 * The production wiring (lib/ai.js:judgeWithHaiku) is injected by the
 * caller in convex/whisperer.js.
 */

import { judgeWithHaiku } from "./ai.js";

export const VALIDATOR_SCHEMA = {
  name: "whisperer_validator_verdict",
  description:
    "A judgment about whether a candidate whisperer response invented stakeholder facts.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      ok: {
        type: "boolean",
        description:
          "True if the response contains NO invented stakeholder facts (or no stakeholder is linked). False if at least one fact was fabricated.",
      },
      reason: {
        type: "string",
        description:
          "One short sentence explaining the verdict. Empty string when ok=true.",
      },
      fabricated: {
        type: "array",
        items: { type: "string" },
        description:
          "Short fragments lifted from the response that contain the invented facts. Empty when ok=true.",
      },
    },
    required: ["ok", "reason", "fabricated"],
  },
};

const VALIDATOR_SYSTEM_PROMPT = `You are a strict fact-grounding judge for an AI coaching tool.

You will receive:
  1. The EXACT stakeholder facts the original prompt was given (or "none" if no stakeholder was linked).
  2. Task context the user themselves wrote (title + description) — treat this as grounded source material the model was allowed to quote or paraphrase.
  3. A candidate response (coaching summary + optional artifact).

Your single job: decide whether the candidate response invents NEW stakeholder facts that are NOT in either source above. Examples of inventions:
  - Naming a stakeholder when no name was supplied in the facts AND not in the task context.
  - Inventing tenure, history, or personality NOT present in either source.
  - Asserting a relationship attribute (e.g. "skeptical of new hires", "remote-first") that wasn't in either source.

Things that are NOT inventions:
  - Referring to the stakeholder by a role label when no name was supplied (e.g. "your manager", "the stakeholder you're meeting with").
  - Generic coaching advice that doesn't make claims about the stakeholder.
  - Repeating a fact that IS in the supplied facts.
  - Quoting OR paraphrasing claims that appear in the task context (e.g. if the task description says "he's a former CEO", the response can say that too).

Output: structured JSON via the supplied tool. Be concise — fabricated[] should contain the literal fragments at issue, not paraphrases.`;

/**
 * Validate a parsed hybrid response. Returns the judge verdict.
 *
 * @param {object} response - The hybrid response object the model
 *   produced (see HYBRID_RESPONSE_SCHEMA).
 * @param {object | null} stakeholderFacts - The fact map the prompt
 *   surfaced (see whispererPrompts.stakeholderFactsForValidation). When
 *   null/undefined we short-circuit ok=true because there's nothing
 *   to fabricate against.
 * @param {(systemPrompt:string, userPrompt:string, schema:object)=>Promise<{json:object}>} [judge]
 *   Override the production Haiku judge. Tests pass a fake here.
 */
export async function validateResponse(response, stakeholderFacts, judge = defaultJudge) {
  // Short-circuit: no stakeholder linked → nothing to fabricate against.
  if (!stakeholderFacts) {
    return { ok: true, reason: "", fabricated: [] };
  }
  // Defensive: nothing to judge → ok.
  if (!response || typeof response !== "object") {
    return { ok: true, reason: "", fabricated: [] };
  }

  const userPrompt = buildJudgePrompt(response, stakeholderFacts);
  let result;
  try {
    result = await judge(VALIDATOR_SYSTEM_PROMPT, userPrompt, VALIDATOR_SCHEMA);
  } catch (err) {
    // If the judge call itself fails, we surface an opinionated
    // "could-not-verify" verdict. The caller is expected to treat this
    // the same as a fail (regenerate or surface provider_unavailable).
    return {
      ok: false,
      reason: `judge_unavailable: ${err && err.message ? err.message : "unknown"}`,
      fabricated: [],
    };
  }

  const verdict = result.json || {};
  return {
    ok: verdict.ok === true,
    reason: typeof verdict.reason === "string" ? verdict.reason : "",
    fabricated: Array.isArray(verdict.fabricated) ? verdict.fabricated : [],
  };
}

function buildJudgePrompt(response, stakeholderFacts) {
  const lines = [];
  lines.push("# Supplied stakeholder facts");
  const facts = stakeholderFacts || {};
  if (!facts.name && !facts.role && !facts.relationshipType) {
    lines.push("(no specific facts beyond presence)");
  }
  if (facts.name) lines.push(`Name: ${facts.name}`);
  else lines.push("Name: (not supplied)");
  if (facts.role) lines.push(`Role: ${facts.role}`);
  if (facts.relationshipType) lines.push(`Relationship: ${facts.relationshipType}`);
  if (facts.priority) lines.push(`Priority: ${facts.priority}`);
  if (facts.stance) lines.push(`Stance: ${facts.stance}`);
  if (facts.influenceLevel) lines.push(`Influence level: ${facts.influenceLevel}`);
  if (facts.taskContext && facts.taskContext.trim()) {
    lines.push("");
    lines.push("# Task context the model was given (treat as grounded)");
    lines.push(String(facts.taskContext));
    lines.push(
      "Any claim that paraphrases or directly echoes this task context is grounded, NOT fabrication."
    );
  }
  lines.push("");
  lines.push("# Candidate response — coaching_summary");
  lines.push(String(response.coaching_summary || "(empty)"));
  if (response.artifact && response.artifact.trim()) {
    lines.push("");
    lines.push("# Candidate response — artifact");
    lines.push(String(response.artifact));
  }
  if (response.clarifying_question && response.clarifying_question.trim()) {
    lines.push("");
    lines.push("# Candidate response — clarifying_question");
    lines.push(String(response.clarifying_question));
  }
  lines.push("");
  lines.push("Judge it. Respond via the supplied JSON tool.");
  return lines.join("\n");
}

async function defaultJudge(systemPrompt, userPrompt, schema) {
  return judgeWithHaiku(systemPrompt, userPrompt, schema);
}
