"use client";

import { Icon } from "@iconify/react";

export default function SmallTaskTip({ tip, onDraftItAnyway, busy }) {
  return (
    <div className="rounded-lg border border-[#D97757]/15 bg-[#1F1510]/60 p-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-[#1F1510] text-[#D97757] shrink-0">
          <Icon icon="solar:lightbulb-bolt-linear" width={16} height={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-200 leading-relaxed whitespace-pre-line">
            {tip}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onDraftItAnyway}
              disabled={busy}
              className="text-xs text-[#D97757] hover:text-[#E89070] disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Icon icon="solar:document-add-linear" width={12} height={12} />
              <span>{busy ? "drafting…" : "draft it anyway"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
