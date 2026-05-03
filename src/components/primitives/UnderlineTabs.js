"use client";

import { cn } from "@/lib/utils";

/**
 * Underline-style tabs. Text-only with an accent underline on the active tab.
 * Use for primary mode switches (e.g. status filter) where pill chips would
 * be too visually heavy and a segmented control would be too rigid.
 */
export default function UnderlineTabs({
  items,
  activeKey,
  onChange,
  ariaLabel,
  className,
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative -mx-4 sm:mx-0 border-b border-warm-borderDark",
        className
      )}
    >
      <div className="no-scrollbar flex gap-5 sm:gap-6 overflow-x-auto px-4 sm:px-0">
        {items.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange?.(tab.key)}
              className={cn(
                "shrink-0 -mb-px py-2.5 font-space-grotesk text-sm transition-colors border-b-2 min-h-11 focus-visible:outline-none focus-visible:text-warm-line",
                active
                  ? "text-warm-line border-accent"
                  : "text-warm-300 border-transparent hover:text-warm-line"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
