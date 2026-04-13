"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Regenerate the user's AI-drafted plan. Confirmation is deliberate —
 * regenerate wipes goals / week themes / activities and replaces them
 * with a fresh draft from the user's current onboarding context + KB.
 *
 * Plan-level collaborators, invitations, and plan-level comments are
 * preserved (the plans._id stays the same). Week / activity / goal
 * comments are dropped because the ids they target no longer exist.
 */
export default function RegeneratePlanModal({ onClose }) {
  const generatePlan = useAction(api.ai.generatePlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await generatePlan({ regenerate: true });
      setResult(r);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Regeneration failed. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="bg-[#1C1917] border border-[#2C2825] rounded-2xl max-w-md w-full p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="font-instrument-serif text-2xl text-[#E7E5E4]">
            Regenerate your plan?
          </h2>
          <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E] leading-relaxed">
            We&apos;ll redraft your goals, week themes, and activities from
            your onboarding context and anything in your knowledge base.
            This replaces the current plan contents — collaborators and
            plan-level comments stay attached, but any progress on
            individual activities will be lost.
          </p>
        </div>

        {result && (
          <div className="bg-[#0F0E0D] border border-[#2C2825] rounded-lg p-4 space-y-1">
            <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
              {result.source === "fallback" ? "Used fallback" : "New draft"}
            </p>
            <p className="font-space-grotesk text-sm text-[#E7E5E4]">
              {result.source === "fallback"
                ? "The AI couldn't draft a personalised plan right now, so we used a generic Watkins-aligned template. You can try again later."
                : `${result.goalsGenerated ?? 0} goals, ${
                    result.weekThemesGenerated ?? 0
                  } week themes, ${result.activitiesGenerated} activities.`}
            </p>
            {result.kbDocsUsed + result.kbMemoriesUsed > 0 && (
              <p className="font-space-grotesk text-xs text-[#78716C]">
                Grounded in {result.kbDocsUsed} KB docs · {result.kbMemoriesUsed} memories
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="font-space-grotesk text-sm text-red-400">{error}</p>
        )}

        {busy && (
          <div className="flex items-center gap-3 text-sm text-[#A8A29E] font-space-grotesk">
            <div className="w-4 h-4 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
            <span>Drafting your new plan… this takes 30-60 seconds.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="font-space-grotesk text-sm px-4 py-2 rounded-lg text-[#A8A29E] hover:text-[#E7E5E4] transition disabled:opacity-50"
          >
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              type="button"
              disabled={busy}
              onClick={run}
              className="font-space-grotesk text-sm px-4 py-2 rounded-lg bg-[#D97757] hover:bg-[#C26242] text-white transition disabled:opacity-50"
            >
              {busy ? "Working…" : "Regenerate plan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
