/**
 * Reconstruct the response envelope `WhispererResponse` consumes from
 * a persisted thread + ordered turn list. Used by `HelpWithThisButton`
 * to rehydrate the response container on resume — instead of firing a
 * fresh `respond` action call when the user reopens the affordance on
 * a task they've already worked with.
 *
 * Returns `null` when there's no assistant turn to display (empty
 * thread, or only user turns from a mid-conversation send that the
 * model never answered).
 *
 * The classifier decision is NOT reconstructed (it lives in
 * planEventLog if exact replay is ever needed); the UI doesn't surface
 * the classifier label, so omission is harmless.
 */
export function envelopeFromTurns(thread, turns) {
  if (!thread || !Array.isArray(turns) || turns.length === 0) return null;

  const lastAssistant = [...turns]
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    .reverse()
    .find((t) => t.role === "assistant");
  if (!lastAssistant) return null;

  const artifact =
    typeof lastAssistant.artifact === "string" && lastAssistant.artifact.trim()
      ? lastAssistant.artifact
      : undefined;
  const clarifyingQuestion =
    typeof lastAssistant.clarifyingQuestion === "string" &&
    lastAssistant.clarifyingQuestion.trim()
      ? lastAssistant.clarifyingQuestion
      : undefined;
  const assumptions = Array.isArray(lastAssistant.assumptions)
    ? lastAssistant.assumptions
    : [];

  const path = artifact
    ? "hybrid"
    : clarifyingQuestion
    ? "clarify"
    : isSmallShape(lastAssistant.content)
    ? "small"
    : "hybrid";

  return {
    status: "ok",
    path,
    coachingSummary: lastAssistant.content || "",
    artifact,
    assumptions,
    clarifyingQuestion,
    threadId: thread._id,
    turnId: lastAssistant._id,
    resumed: true,
  };
}

function isSmallShape(content) {
  if (typeof content !== "string") return false;
  const trimmed = content.trim();
  if (!trimmed) return false;
  return trimmed.length <= 240 && trimmed.split(/\n/).length <= 2;
}
