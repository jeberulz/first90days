/**
 * Whisperer escalate-to-manager copy-text helper (U6 v1).
 *
 * v1 click behavior on the `escalate_to_manager` soft-block option:
 * the envelope returns a `copy_text` blob the UI surfaces with a
 * "copy to clipboard" affordance and a microcopy line explaining that
 * one-tap send-to-manager is coming in a future release.
 *
 * v2 will replace this with a real send pathway. Keeping the format
 * here means v2 can swap the wire format without changing every
 * caller.
 *
 * Pure function — no Convex ctx, no I/O.
 */

const MAX_RECAP_CHARS = 1200;
const MAX_TASK_CONTEXT_CHARS = 400;

/**
 * Build the Slack/email-ready copy-text for an escalation.
 *
 * @param {Object} args
 * @param {string} args.taskTitle
 * @param {string} [args.taskDescription]
 * @param {string} [args.stakeholderRole] - Role label of the manager
 *   stakeholder if linked. Falls back to "your manager".
 * @param {string} [args.stakeholderName] - Stakeholder display name.
 * @param {string} args.recapText - The recap turn content (or the most
 *   recent assistant summary if no recap exists yet).
 * @returns {{ copy_text: string, microcopy: string }}
 */
export function buildEscalationCopyText({
  taskTitle,
  taskDescription,
  stakeholderRole,
  stakeholderName,
  recapText,
}) {
  const title = String(taskTitle || "").trim();
  const desc = String(taskDescription || "").trim().slice(0, MAX_TASK_CONTEXT_CHARS);
  const recap = String(recapText || "").trim().slice(0, MAX_RECAP_CHARS);
  const addressee = (() => {
    if (stakeholderName && stakeholderName.trim()) return stakeholderName.trim();
    if (stakeholderRole && stakeholderRole.trim()) return stakeholderRole.trim();
    return "your manager";
  })();

  const lines = [];
  lines.push(`Hi ${addressee},`);
  lines.push("");
  lines.push("I'd like to bring you in on something I'm working on:");
  if (title) {
    lines.push(`Task: ${title}`);
  }
  if (desc) {
    lines.push(`Context: ${desc}`);
  }
  lines.push("");
  lines.push("Where I am:");
  lines.push(recap || "I've been working through this and would value your input.");
  lines.push("");
  lines.push("Could we find ten minutes to align on next steps?");
  lines.push("");
  lines.push("Thanks");

  return {
    copy_text: lines.join("\n"),
    microcopy:
      "Copy this and paste into Slack or email — one-tap send-to-manager is coming soon.",
  };
}
