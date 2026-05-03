"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

/**
 * One-shot celebration modal that fires when the user crosses a phase
 * boundary (day 30 → Learn, day 60 → Contribute, day 90 → Lead).
 *
 * The parent mounts this conditionally on `milestone != null`. On
 * dismissal we call `acknowledgeMilestone` which stamps
 * `milestoneAcknowledgedAt` on the phase row; the useQuery in the
 * parent then reactively returns null and the modal unmounts.
 *
 * We deliberately don't reuse CompletionOverlay because that component
 * has a 2.4s auto-dismiss built in — this modal should stay open until
 * the user engages with it (dismiss or click "Reflect").
 */
export default function PhaseCompletionModal({ milestone, onClose }) {
  const acknowledge = useMutation(api.milestones.acknowledgeMilestone);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !busy) handleDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, milestone?.phaseId]);

  async function handleDismiss() {
    if (busy || !milestone) return;
    setBusy(true);
    try {
      await acknowledge({ phaseId: milestone.phaseId });
      onClose?.();
    } catch (err) {
      // If ack fails the query will just keep returning the milestone
      // and the modal will re-open on next load — safe to surface.
      console.error("[PhaseCompletionModal] acknowledge failed", err);
      setBusy(false);
    }
  }

  if (!milestone) return null;

  const { phaseNumber, phaseName, stats, isFinalPhase, milestone: headline } =
    milestone;

  const title = isFinalPhase
    ? "90 days. Done."
    : `Phase ${phaseNumber} complete`;
  const subtitle = isFinalPhase
    ? "You've reached Lead. Time to look back at the whole arc."
    : `${phaseName} wrapped. Take a breath before the next phase kicks in.`;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => handleDismiss()}
    >
      <div
        className="bg-gradient-to-br from-[#D97757]/15 to-[#1C1917] border border-[#D97757]/40 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-space-grotesk text-[10px] font-medium uppercase tracking-[0.8px] text-[#D97757] bg-[#D97757]/10 border border-[#D97757]/30 rounded-full px-2 py-0.5">
              Milestone
            </span>
            <span className="font-space-grotesk text-xs text-[#A8A29E]">
              Day {milestone.endDay}
            </span>
          </div>
          <h2 className="font-instrument-serif text-3xl tracking-[-0.6px] leading-[36px] text-[#E7E5E4]">
            {title}
          </h2>
          <p className="font-space-grotesk text-sm text-[#A8A29E] leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Phase tagline from schema (if set) */}
        {headline && (
          <div className="bg-[#0F0E0D]/60 border border-[#2C2825] rounded-xl p-4">
            <p className="font-space-grotesk text-[10px] font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-1">
              Phase {phaseNumber} was about
            </p>
            <p className="font-instrument-serif text-lg text-[#E7E5E4] leading-snug">
              {headline}
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Activities"
            value={`${stats.activitiesCompleted} / ${stats.activitiesPlanned}`}
            accent={`${stats.completionPct}% done`}
          />
          <StatCard
            label="Goals"
            value={`${stats.goalsCompleted} / ${stats.goalsTotal}`}
            accent={
              stats.goalsTotal === 0
                ? "none set"
                : stats.goalsCompleted === stats.goalsTotal
                  ? "all hit"
                  : "in progress"
            }
          />
          <StatCard
            label="Wins logged"
            value={String(stats.winsCount)}
            accent={stats.winsCount === 1 ? "win" : "wins"}
          />
          <StatCard
            label="Learnings"
            value={String(stats.learningsCount)}
            accent={stats.learningsCount === 1 ? "note" : "notes"}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href={`/reflect/phase/${phaseNumber}`}
            onClick={() => handleDismiss()}
            className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-5 py-3 font-space-grotesk text-sm font-medium transition text-center shadow-sm"
          >
            Reflect on Phase {phaseNumber} →
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleDismiss()}
            className="w-full font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition disabled:opacity-50 py-1"
          >
            {busy ? "Saving…" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-[#0F0E0D]/60 border border-[#2C2825] rounded-xl p-4">
      <p className="font-space-grotesk text-[10px] font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
        {label}
      </p>
      <p className="mt-1 font-instrument-serif text-2xl text-[#E7E5E4] leading-none">
        {value}
      </p>
      <p className="mt-1 font-space-grotesk text-[11px] text-[#78716C]">
        {accent}
      </p>
    </div>
  );
}
