"use client";

import { Icon } from "@iconify/react";

export default function QuotaIndicator({ remaining }) {
  if (typeof remaining !== "number" || remaining < 0) return null;
  return (
    <div className="inline-flex items-center gap-1 text-[11px] text-stone-500">
      <Icon icon="solar:battery-low-linear" width={12} height={12} />
      <span>~{remaining} whisperer calls left today</span>
    </div>
  );
}
