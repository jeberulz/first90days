"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Two small components for goal sign-off, sharing one file because they
 * always render together.
 *
 *   <GoalApprovalBadge goal={goal} /> — read-only pill, shown to both
 *     owner and reviewer wherever a goal renders.
 *
 *   <GoalApprovalActions goal={goal} viewerRole="owner" />
 *     - Owner: "Request approval" / "Withdraw request"
 *     - Manager / viewer: "Approve" + "Request changes" once the owner
 *       has submitted the goal for sign-off.
 */

function statusLabel(status) {
  switch (status) {
    case "approved":
      return { text: "Approved", tone: "approved" };
    case "requested":
      return { text: "Awaiting approval", tone: "pending" };
    case "changes_requested":
      return { text: "Changes requested", tone: "changes" };
    default:
      return null;
  }
}

const TONE_STYLES = {
  approved:
    "bg-green-500/10 text-green-300 border-green-500/30",
  pending:
    "bg-[#D97757]/10 text-[#D97757] border-[#D97757]/30",
  changes:
    "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

export function GoalApprovalBadge({ goal }) {
  const label = statusLabel(goal.approvalStatus);
  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 font-space-grotesk text-[10px] font-medium uppercase tracking-[0.4px] px-2 py-0.5 rounded-full border ${TONE_STYLES[label.tone]}`}
      title={
        goal.approvalNote ? `Note: ${goal.approvalNote}` : undefined
      }
    >
      {label.tone === "approved" && (
        <svg aria-hidden="true" width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6l3 3 5-5" />
        </svg>
      )}
      {label.text}
    </span>
  );
}

export function GoalApprovalActions({ goal, viewerRole }) {
  const requestApproval = useMutation(api.goals.requestApproval);
  const withdrawRequest = useMutation(api.goals.withdrawApprovalRequest);
  const approveGoal = useMutation(api.goals.approveGoal);
  const requestChanges = useMutation(api.goals.requestChanges);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNote, setChangesNote] = useState("");

  async function run(fn) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (viewerRole === "owner") {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {goal.approvalStatus !== "requested" &&
          goal.approvalStatus !== "approved" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => requestApproval({ id: goal._id }))}
              className="font-space-grotesk text-[11px] px-2.5 py-1 rounded-md border border-[#D97757]/40 text-[#D97757] hover:bg-[#D97757]/10 transition disabled:opacity-50"
            >
              {goal.approvalStatus === "changes_requested"
                ? "Resubmit for approval"
                : "Request manager approval"}
            </button>
          )}
        {goal.approvalStatus === "requested" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => withdrawRequest({ id: goal._id }))}
            className="font-space-grotesk text-[11px] text-[#A8A29E] hover:text-[#E7E5E4] transition"
          >
            Withdraw request
          </button>
        )}
        {goal.approvalNote && goal.approvalStatus !== "approved" && (
          <p className="basis-full font-space-grotesk text-xs text-[#A8A29E]">
            <span className="text-[#78716C]">Manager note:</span>{" "}
            {goal.approvalNote}
          </p>
        )}
        {error && (
          <p className="basis-full font-space-grotesk text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Reviewer (manager / viewer)
  if (goal.approvalStatus !== "requested") {
    if (goal.approvalStatus === "approved" && goal.approverName) {
      return (
        <p className="mt-2 font-space-grotesk text-xs text-[#A8A29E]">
          Approved by {goal.approverName}
          {goal.approvalNote ? ` — “${goal.approvalNote}”` : ""}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {!changesOpen ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => approveGoal({ id: goal._id }))}
            className="font-space-grotesk text-[11px] px-2.5 py-1 rounded-md bg-green-600/80 text-white hover:bg-green-600 transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setChangesOpen(true)}
            className="font-space-grotesk text-[11px] px-2.5 py-1 rounded-md border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition"
          >
            Request changes
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={changesNote}
            onChange={(e) => setChangesNote(e.target.value)}
            placeholder="What needs to change?"
            className="w-full bg-[#0F0E0D] border border-[#44403C] rounded-lg px-2.5 py-1.5 font-space-grotesk text-xs text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !changesNote.trim()}
              onClick={() =>
                run(async () => {
                  await requestChanges({
                    id: goal._id,
                    note: changesNote.trim(),
                  });
                  setChangesNote("");
                  setChangesOpen(false);
                })
              }
              className="font-space-grotesk text-[11px] px-2.5 py-1 rounded-md bg-amber-600/80 text-white hover:bg-amber-600 transition disabled:opacity-50"
            >
              Send back
            </button>
            <button
              type="button"
              onClick={() => {
                setChangesOpen(false);
                setChangesNote("");
              }}
              className="font-space-grotesk text-[11px] px-2.5 py-1 text-[#A8A29E] hover:text-[#E7E5E4] transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="font-space-grotesk text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
