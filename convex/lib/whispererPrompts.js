/**
 * Whisperer prompt builders + hybrid response schema (U4).
 *
 * Pure functions only — no Convex ctx, no I/O. The orchestration layer
 * (convex/whisperer.js) assembles a ContextBundle, classifies the task,
 * builds a prompt via these helpers, and calls generateStructured() with
 * one of the schema descriptors exported below.
 *
 * The hybrid schema is a single JSON shape the model must emit. We
 * surface it both as an Anthropic tool_use input_schema and as an OpenAI
 * response_format json_schema — lib/ai.js:generateStructured picks the
 * right one per provider.
 */

/**
 * Hard caps (token-rough) for the four sections of a full hybrid
 * response. The model is told these limits in the system prompt AND
 * we enforce them post-parse — semantic-check failures trigger the
 * single retry path documented in U4 step 7.
 */
export const COACHING_MAX_CHARS = 1200;
export const COACHING_MIN_CHARS = 40;
export const ARTIFACT_MIN_CHARS = 60;
export const ARTIFACT_MAX_CHARS = 4000;
export const ASSUMPTIONS_MAX = 5;
export const SMALL_TASK_MAX_CHARS = 240;
export const SMALL_TASK_MAX_LINES = 2;

/**
 * Forced-output schema for the v1 hybrid response. Note: `additionalProperties:
 * false` is critical — without it OpenAI's structured output and Claude's
 * tool_use both happily emit extra keys that bypass our parser.
 */
export const HYBRID_RESPONSE_SCHEMA = {
  name: "whisperer_response",
  description:
    "The whisperer's structured reply: coaching, optional artifact, assumptions, and (when the task is too vague) a single clarifying question.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      coaching_summary: {
        type: "string",
        description:
          "Two to four short sentences of grounded coaching. Reference the user's actual context (role, phase, linked stakeholder/goal). When mode=clarify, this field MUST be an empty string.",
      },
      artifact: {
        type: "string",
        description:
          "Optional drafted artifact (email, agenda, message, doc skeleton). Present ONLY when the task is artifact-shaped and mode=full. Omit otherwise — the field can be the empty string when absent.",
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        description:
          "Zero to five short assumptions the response is grounded on. Each assumption is one sentence and should be the kind of statement the user can challenge inline.",
      },
      clarifying_question: {
        type: "string",
        description:
          "A single clarifying question, ending with '?'. Present ONLY when mode=clarify; otherwise omit (empty string).",
      },
    },
    required: ["coaching_summary", "assumptions"],
  },
};

const ROLE_LABEL_FALLBACK = "the stakeholder you're meeting with";

/**
 * System prompt scaffold — the same anchor for all whisperer turns.
 * Concrete context (task, role, week, etc.) is layered on by the user
 * prompt builders below.
 */
export const WHISPERER_SYSTEM_PROMPT = `You are the Arcora task whisperer — a focused coaching layer that helps a person executing a 90-day plan move a specific task forward right now.

Hard rules:
- Ground every claim in the supplied context. Do NOT invent stakeholder names, roles, goals, or facts that are not stated.
- If a stakeholder is linked but has no name, refer to them by role label only (e.g. "your manager", "your engineering peer"). Never invent a name.
- Keep coaching_summary to two to four short sentences, grounded and specific.
- When you produce an artifact, it must be ready to copy-paste; no meta-commentary inside the artifact body.
- Assumptions are how you flag what you had to guess. Each one is one short sentence the user can challenge.

Output format: a single JSON object matching the supplied schema. No prose outside JSON.`;

/**
 * Build the user prompt for the FULL (artifact + coaching) one-shot
 * path. Used for both `shape: "artifact"` and `shape: "coaching"` —
 * the only difference is whether the system instructs the model to
 * include an artifact section.
 */
export function buildHybridPrompt(bundle, shape, options = {}) {
  const { strict = false, piiNote = null, parseHint = null } = options;
  const lines = [];

  lines.push("# Mode");
  lines.push("full");
  lines.push("");

  lines.push("# Task");
  lines.push(formatTaskBlock(bundle));
  lines.push("");

  lines.push("# User context");
  lines.push(formatUserContext(bundle));
  lines.push("");

  if (bundle.linkedStakeholder) {
    lines.push("# Linked stakeholder");
    lines.push(formatStakeholder(bundle.linkedStakeholder));
    lines.push("");
  }

  if (bundle.linkedGoal) {
    lines.push("# Linked goal");
    lines.push(formatGoal(bundle.linkedGoal));
    lines.push("");
  }

  if (bundle.adjacentWeekTasks && bundle.adjacentWeekTasks.length > 0) {
    lines.push("# Adjacent week tasks (for context, do not re-plan them)");
    for (const t of bundle.adjacentWeekTasks.slice(0, 8)) {
      lines.push(`- ${t.title}${t.status ? ` (${t.status})` : ""}`);
    }
    lines.push("");
  }

  if (bundle.recentReflections && bundle.recentReflections.length > 0) {
    lines.push("# Recent reflections (most recent first)");
    for (const r of bundle.recentReflections.slice(0, 3)) {
      const head = r.date ? `[${r.date}]` : "";
      lines.push(`- ${head} ${truncate(r.text, 220)}`);
    }
    lines.push("");
  }

  lines.push("# Instructions");
  if (shape === "artifact") {
    lines.push(
      "Produce a coaching_summary (2-4 sentences) AND an `artifact` field containing the drafted deliverable. The artifact must stand on its own — no meta commentary inside it."
    );
  } else {
    lines.push(
      "Produce a coaching_summary (2-4 sentences). Do NOT produce an artifact — leave the artifact field as an empty string."
    );
  }
  lines.push(
    `Provide up to ${ASSUMPTIONS_MAX} assumptions you grounded the response on. Leave clarifying_question empty.`
  );
  lines.push(
    `Coaching_summary must be at most ${COACHING_MAX_CHARS} characters.`
  );
  if (shape === "artifact") {
    lines.push(
      `Artifact must be at least ${ARTIFACT_MIN_CHARS} characters and at most ${ARTIFACT_MAX_CHARS}.`
    );
  }

  if (strict) {
    lines.push("");
    lines.push("STRICT MODE: the previous attempt failed validation.");
    if (parseHint) lines.push(`Parse hint: ${parseHint}`);
    if (piiNote) lines.push(`PII note: ${piiNote}`);
    lines.push(
      "Respond with valid JSON only. Do not include any text outside the JSON object. Do not invent stakeholder facts."
    );
  }

  return lines.join("\n");
}

/**
 * Vague-task path: title token count < 4 and no stakeholder / goal
 * linkage. Instruct the model to produce only a clarifying_question.
 */
export function buildClarifyingPrompt(bundle, options = {}) {
  const { strict = false } = options;
  const lines = [];
  lines.push("# Mode");
  lines.push("clarify");
  lines.push("");

  lines.push("# Task");
  lines.push(formatTaskBlock(bundle));
  lines.push("");

  lines.push("# User context");
  lines.push(formatUserContext(bundle));
  lines.push("");

  lines.push("# Instructions");
  lines.push(
    "The task is too vague to coach on. Produce a SINGLE clarifying_question that, once answered, would let you produce useful coaching. Question must end with '?'. Leave coaching_summary as an empty string. Leave artifact empty. Provide zero assumptions."
  );

  if (strict) {
    lines.push("");
    lines.push(
      "STRICT MODE: respond with valid JSON only. Exactly one clarifying_question ending in '?'."
    );
  }

  return lines.join("\n");
}

/**
 * Small-task path: ≤ 2 lines of plain coaching, no artifact, no
 * clarifying question. The user can override into the full path via
 * the `force_full = true` arg on respond().
 */
export function buildSmallTaskPrompt(bundle, options = {}) {
  const { strict = false } = options;
  const lines = [];
  lines.push("# Mode");
  lines.push("small");
  lines.push("");

  lines.push("# Task");
  lines.push(formatTaskBlock(bundle));
  lines.push("");

  lines.push("# User context");
  lines.push(formatUserContext(bundle));
  lines.push("");

  lines.push("# Instructions");
  lines.push(
    `Respond with at most ${SMALL_TASK_MAX_LINES} short lines (no more than ${SMALL_TASK_MAX_CHARS} characters total) in coaching_summary. Do NOT produce an artifact. Do NOT produce a clarifying_question. Provide at most 1 assumption.`
  );

  if (strict) {
    lines.push("");
    lines.push("STRICT MODE: respond with valid JSON only. Keep it short.");
  }

  return lines.join("\n");
}

/**
 * Continuation prompt: feeds the conversation-so-far into the same
 * hybrid schema used by U4's one-shot reply. Wraps `buildHybridPrompt`
 * to keep the grounding sections identical and APPENDS a
 * "Conversation so far" block before the # Instructions section so the
 * model treats prior turns as context, not new instructions.
 *
 * `history` is an array of `{ role, content }` (user|assistant|system)
 * already ordered by seq. Long histories are truncated to the last 16
 * turns (covers worst-case 10 user + 10 assistant comfortably).
 *
 * `shape` mirrors `buildHybridPrompt(bundle, shape)` — the continuation
 * still emits the hybrid schema (artifact optional). Most continuation
 * turns are coaching-only, but the user may ask for a redrafted
 * artifact mid-thread, so we keep shape flexible.
 */
export function buildContinuationPrompt(bundle, history, shape, options = {}) {
  const { strict = false, piiNote = null, parseHint = null } = options;
  const base = buildHybridPrompt(bundle, shape, {
    strict: false,
    piiNote: null,
    parseHint: null,
  });

  const histLines = [];
  histLines.push("");
  histLines.push("# Conversation so far");
  const recent = Array.isArray(history) ? history.slice(-16) : [];
  if (recent.length === 0) {
    histLines.push("(no prior turns)");
  } else {
    for (const turn of recent) {
      const role = turn.role === "assistant" ? "assistant" : "user";
      const text = truncate(String(turn.content || ""), 800);
      histLines.push(`- ${role}: ${text}`);
    }
  }

  // Insert the history block just before "# Instructions". The hybrid
  // builder always emits "# Instructions" exactly once at the bottom;
  // splicing in the conversation log immediately above keeps the
  // grounding sections ordered the way the model expects (context →
  // history → ask).
  const idx = base.indexOf("# Instructions");
  let body;
  if (idx === -1) {
    body = `${base}\n${histLines.join("\n")}`;
  } else {
    body = `${base.slice(0, idx)}${histLines.join("\n")}\n\n${base.slice(idx)}`;
  }

  if (strict) {
    const strictTail = [
      "",
      "STRICT MODE: the previous attempt failed validation.",
      ...(parseHint ? [`Parse hint: ${parseHint}`] : []),
      ...(piiNote ? [`PII note: ${piiNote}`] : []),
      "Respond with valid JSON only. Do not include any text outside the JSON object. Do not invent stakeholder facts.",
    ];
    body = `${body}\n${strictTail.join("\n")}`;
  }
  return body;
}

/**
 * Cap-recap prompt: free closing summary when a chat hits the
 * 10-turn organic cap (or cents ceiling mid-thread). The recap is a
 * Sonnet call but does NOT count against the user's daily ledger —
 * see OP_COSTS.whisperer_recap = 0. We use generateText (plain) here,
 * not the hybrid schema, because the recap is a single short paragraph,
 * not a structured artifact.
 *
 * `reason` is one of: "turn_limit" | "cents_ceiling".
 */
export function buildCapRecapPrompt(bundle, history, reason) {
  const lines = [];
  lines.push("# Mode");
  lines.push("recap");
  lines.push("");

  lines.push("# Task");
  lines.push(formatTaskBlock(bundle));
  lines.push("");

  lines.push("# User context");
  lines.push(formatUserContext(bundle));
  lines.push("");

  const recent = Array.isArray(history) ? history.slice(-16) : [];
  if (recent.length > 0) {
    lines.push("# Conversation so far");
    for (const turn of recent) {
      const role = turn.role === "assistant" ? "assistant" : "user";
      const text = truncate(String(turn.content || ""), 600);
      lines.push(`- ${role}: ${text}`);
    }
    lines.push("");
  }

  lines.push("# Instructions");
  if (reason === "cents_ceiling") {
    lines.push(
      "The user has hit today's AI usage ceiling mid-conversation. Produce a graceful closing summary (3-5 short sentences) that: (1) names the most useful next step from the conversation, (2) acknowledges this thread is pausing, (3) suggests they mark the task done, escalate it, or close unresolved. Do not invent stakeholder facts. Be warm, concrete, and brief."
    );
  } else {
    lines.push(
      "This conversation has reached its 10-turn ritual cap. Produce a closing recap (3-5 short sentences) that: (1) summarizes the most actionable next step from the conversation, (2) acknowledges the cap, (3) invites the user to mark the task done, escalate it, or close it unresolved. Do not invent stakeholder facts. Be warm, concrete, and brief."
    );
  }
  lines.push("Respond with plain prose only — no JSON, no preamble.");

  return lines.join("\n");
}

/* ----- helpers ----- */

function formatTaskBlock(bundle) {
  const t = bundle.task;
  const lines = [];
  lines.push(`Title: ${t.title}`);
  if (t.description && t.description.trim()) {
    lines.push(`Description: ${truncate(t.description, 600)}`);
  }
  if (t.category) lines.push(`Category: ${t.category}`);
  if (t.priority) lines.push(`Priority: ${t.priority}`);
  if (typeof t.weekNumber === "number") {
    lines.push(`Plan week: ${t.weekNumber}`);
  }
  return lines.join("\n");
}

function formatUserContext(bundle) {
  const u = bundle.user || {};
  const parts = [];
  if (u.roleTitle) parts.push(`Role: ${u.roleTitle}`);
  if (u.function_) parts.push(`Function: ${u.function_}`);
  if (u.companyName) parts.push(`Company: ${u.companyName}`);
  if (u.starsSituation) parts.push(`STARS situation: ${u.starsSituation}`);
  if (typeof u.phaseNumber === "number") {
    parts.push(`Current phase: ${u.phaseNumber} (${u.phaseName || ""})`);
  }
  if (u.weekTheme) parts.push(`This week's theme: ${u.weekTheme}`);
  if (u.experienceYears !== undefined) {
    parts.push(`Experience: ${u.experienceYears} yrs`);
  }
  return parts.length > 0 ? parts.join("\n") : "(no onboarding context)";
}

function formatStakeholder(s) {
  // Stakeholder linked but no name → role-label only. Closes R17.
  const parts = [];
  if (s.name && s.name.trim()) {
    parts.push(`Name: ${s.name}`);
  } else {
    parts.push(`Name: (unnamed — refer to them as "${ROLE_LABEL_FALLBACK}")`);
  }
  if (s.role) parts.push(`Role: ${s.role}`);
  if (s.relationshipType) parts.push(`Relationship: ${s.relationshipType}`);
  if (s.priority) parts.push(`Priority: ${s.priority}`);
  if (s.stance) parts.push(`Stance: ${s.stance}`);
  if (s.influenceLevel) parts.push(`Influence: ${s.influenceLevel}`);
  return parts.join("\n");
}

function formatGoal(g) {
  const parts = [];
  if (g.title) parts.push(`Title: ${g.title}`);
  if (g.category) parts.push(`Category: ${g.category}`);
  if (typeof g.targetPhase === "number") parts.push(`Target phase: ${g.targetPhase}`);
  if (g.status) parts.push(`Status: ${g.status}`);
  return parts.join("\n");
}

function truncate(s, max) {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Compose the EXACT stakeholder facts the validator should compare a
 * response against. Used by lib/whispererValidator.js so the validator
 * judge has the same anchor as the prompt builder.
 */
export function stakeholderFactsForValidation(bundle) {
  const s = bundle.linkedStakeholder;
  const task = bundle.task || {};
  // taskContext captures what the prompt EXPLICITLY supplied about the
  // person/task. The validator treats claims that echo this content as
  // grounded — only claims that go beyond it are fabrication. Without
  // this, the model can't safely repeat facts the user themselves
  // wrote into the task description (e.g. "Peter is a former CEO").
  const taskContext = [task.title, task.description].filter(Boolean).join("\n");
  if (!s && !taskContext) return null;
  return {
    name: s?.name && s.name.trim() ? s.name : null,
    role: s?.role || null,
    relationshipType: s?.relationshipType || null,
    priority: s?.priority || null,
    stance: s?.stance || null,
    influenceLevel: s?.influenceLevel || null,
    taskContext: taskContext || null,
  };
}

export { ROLE_LABEL_FALLBACK };
