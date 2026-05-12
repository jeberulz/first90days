/**
 * Heuristic task-size + artifact-shape classifiers (U4, v1).
 *
 * Per plan U4 these are rule-based for v1. U9's eval suite verifies the
 * classifiers hit the targets in fixture data; if they don't, we
 * promote the high-error ones to an LLM call in a later cut. For now
 * the cheap-and-readable heuristic wins.
 *
 * Pure functions: no Convex ctx, no I/O.
 */

// Verbs that almost always imply an artifact-shaped deliverable.
const ARTIFACT_VERBS = [
  "draft",
  "drafting",
  "write",
  "writing",
  "compose",
  "prepare",
  "preparing",
  "create",
  "outline",
  "outlining",
  "design",
  "designing",
  "send",
  "sending",
  "summarize",
  "summarise",
  "summary",
  "summarising",
  "summarizing",
  "document",
  "documenting",
  "agenda",
  "email",
  "memo",
  "plan",
  "proposal",
  "doc",
  "writeup",
  "write-up",
  "report",
  "rfc",
  "spec",
];

// Verbs that lean toward coaching rather than artifact.
const COACHING_VERBS = [
  "discuss",
  "meet",
  "meeting",
  "review",
  "reflect",
  "reflection",
  "think",
  "decide",
  "ask",
  "listen",
  "observe",
  "talk",
  "1:1",
  "one-on-one",
  "1-on-1",
  "sync",
  "catch up",
  "catchup",
  "introduce",
  "shadow",
];

// Small tasks: tasks that should get a 2-line tip, not a full hybrid
// response. Heuristics: very short titles (<= 4 tokens) AND a "quick"
// estimatedTime AND a low-friction verb (read, skim, watch).
const SMALL_TASK_VERBS = [
  "read",
  "skim",
  "watch",
  "browse",
  "check",
  "look",
  "scan",
  "open",
];

const QUICK_TIME_REGEX = /^\s*(\d{1,2})\s*(m|min|minute|minutes)\s*$/i;

function tokenize(s) {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s:-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function hasVerbMatch(tokens, vocabulary) {
  return tokens.some((t) => vocabulary.includes(t));
}

function estimatedMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const m = timeStr.match(QUICK_TIME_REGEX);
  if (m) return parseInt(m[1], 10);
  // "1h", "30 min", "1.5 hours" — coarse parse, default unknown to null.
  const m2 = timeStr.match(/(\d+(?:\.\d+)?)\s*h/i);
  if (m2) return Math.round(parseFloat(m2[1]) * 60);
  const m3 = timeStr.match(/(\d+)\s*(?:m|min)/i);
  if (m3) return parseInt(m3[1], 10);
  return null;
}

/**
 * Decide the task's classification for U4's routing logic.
 *
 * Inputs: a normalised task object + the assembled context bundle.
 * Returns { size, shape, reason }:
 *   - size: "small" | "full"  — small skips the artifact path
 *     entirely; full goes through the hybrid prompt.
 *   - shape: "artifact" | "coaching"  — only meaningful when
 *     size === "full". Tells the prompt builder whether to demand an
 *     artifact section.
 *   - reason: human-readable trace string for logging + telemetry.
 *
 * Forced full overrides happen at the caller (U4 action) — pass
 * forceFull=true through respond() and the action skips this
 * function's small-task verdict.
 */
export function classifyTask(task, contextBundle) {
  const title = (task && task.title) || "";
  const description = (task && task.description) || "";
  const tokens = tokenize(`${title} ${description}`);
  const titleTokens = tokenize(title);
  const mins = estimatedMinutes(task && task.estimatedTime);

  const isVague = isVagueTask(task, contextBundle);
  if (isVague) {
    return {
      size: "full",
      shape: "clarify",
      reason: "vague_task — title<4 tokens & no stakeholder/goal linkage",
    };
  }

  // Small-task heuristic. Quick OR explicitly low-friction verb on a
  // short title — but never small when there's a linked artifact-style
  // verb in the same title (e.g. "draft + read primer").
  const hasArtifactVerb = hasVerbMatch(tokens, ARTIFACT_VERBS);
  const hasSmallVerb = hasVerbMatch(tokens, SMALL_TASK_VERBS);
  const isShortTitle = titleTokens.length <= 4;
  const isQuick = mins !== null && mins <= 15;

  if (!hasArtifactVerb && isShortTitle && (hasSmallVerb || isQuick)) {
    return {
      size: "small",
      shape: "coaching",
      reason: `small_task — short title (${titleTokens.length} tok)${
        hasSmallVerb ? ", small verb" : ""
      }${isQuick ? `, est ${mins}m` : ""}`,
    };
  }

  const hasCoachingVerb = hasVerbMatch(tokens, COACHING_VERBS);

  // Artifact wins when both signals fire — the deliverable is the
  // higher-leverage output.
  if (hasArtifactVerb) {
    return {
      size: "full",
      shape: "artifact",
      reason: `full_artifact — artifact verb in title/description`,
    };
  }

  if (hasCoachingVerb) {
    return {
      size: "full",
      shape: "coaching",
      reason: `full_coaching — coaching verb in title/description`,
    };
  }

  // Default: coaching path. Safer than producing a stray artifact for
  // an ambiguous task.
  return {
    size: "full",
    shape: "coaching",
    reason: "full_coaching — default (no artifact/coaching verb signal)",
  };
}

/**
 * R6 vague-task detection. Promoted to its own export so the
 * orchestration layer can pre-route to clarifying mode without going
 * through classifyTask's full ladder.
 */
export function isVagueTask(task, contextBundle) {
  if (!task) return false;
  const titleTokens = tokenize(task.title || "");
  const noStakeholder = !contextBundle || !contextBundle.linkedStakeholder;
  const noGoal = !contextBundle || !contextBundle.linkedGoal;
  return titleTokens.length < 4 && noStakeholder && noGoal;
}
