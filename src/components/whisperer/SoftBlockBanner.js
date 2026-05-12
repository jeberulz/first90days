"use client";

import { Icon } from "@iconify/react";

export default function SoftBlockBanner({
  reason,
  centsCapped,
  recap,
  escalateCopyText,
  onMarkDone,
  onClose,
}) {
  async function copyEscalate() {
    if (!escalateCopyText) return;
    try {
      await navigator.clipboard.writeText(escalateCopyText);
    } catch {
      // ignore — copy will silently fail in unsupported contexts
    }
  }

  return (
    <div className="rounded-lg border border-[#D97757]/25 bg-[#1F1510]/70 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Icon icon="solar:flag-2-linear" className="text-[#D97757] mt-0.5" width={16} height={16} />
        <div className="flex-1 text-sm text-stone-200">
          <div className="text-[11px] uppercase tracking-wide text-[#D97757]/80 mb-1">
            {centsCapped ? "daily ai budget reached" : "conversation cap reached"}
          </div>
          <p className="leading-relaxed">{recap || (centsCapped
            ? "You've used most of your AI budget for today. Pick one of the actions below to close out — more available tomorrow."
            : "We've covered a lot. Pick one of the actions below to close out the thread.")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onMarkDone}
          className="text-xs px-3 py-1.5 rounded-md bg-[#D97757] text-stone-950 hover:bg-[#E89070] inline-flex items-center gap-1.5"
        >
          <Icon icon="solar:check-circle-linear" width={12} height={12} />
          mark task done
        </button>
        <button
          type="button"
          onClick={copyEscalate}
          disabled={!escalateCopyText}
          className="text-xs px-3 py-1.5 rounded-md border border-white/15 text-stone-200 hover:bg-white/5 disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <Icon icon="solar:copy-linear" width={12} height={12} />
          escalate to manager (copy)
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-3 py-1.5 rounded-md border border-white/10 text-stone-400 hover:bg-white/5 inline-flex items-center gap-1.5"
        >
          close unresolved
        </button>
      </div>
      {reason ? (
        <div className="text-[10px] text-stone-500 uppercase tracking-wide">reason: {reason}</div>
      ) : null}
    </div>
  );
}
