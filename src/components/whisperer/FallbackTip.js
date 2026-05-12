"use client";

import { Icon } from "@iconify/react";
import { pickFallbackTip } from "@/lib/whispererFallbacks";

export default function FallbackTip({ taskCategory }) {
  const { tip, category } = pickFallbackTip(taskCategory);
  return (
    <div className="rounded-lg border border-white/10 bg-stone-900/60 p-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-stone-800 text-stone-400 shrink-0">
          <Icon icon="solar:cloud-cross-linear" width={16} height={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">
            ai unavailable — here's an evergreen tip
          </div>
          <p className="text-sm text-stone-300 leading-relaxed">{tip}</p>
          {category !== taskCategory && (
            <div className="mt-2 text-[11px] text-stone-500">general advice</div>
          )}
        </div>
      </div>
    </div>
  );
}
