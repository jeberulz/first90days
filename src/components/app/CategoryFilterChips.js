"use client";

import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_STYLES,
} from "@/lib/activityCategories";

function Chip({ active, activeClass, onClick, children }) {
  return (
    // Toggle-button semantics (not role="tab") because each chip is
    // independently focusable and there is no roving focus / arrow-key
    // navigation. aria-pressed conveys the toggle state to AT.
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "snap-start shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap",
        "rounded-full border px-3 py-1.5 font-space-grotesk text-xs sm:text-sm transition-colors min-h-9",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? activeClass
          : "bg-transparent text-warm-300 border-warm-borderDark hover:text-warm-line hover:border-warm-borderMuted"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Category filter chips with per-category active colors.
 * The active "All" uses a neutral treatment so it never competes with a
 * coral pill elsewhere on the page; each category lights up in its own
 * color (blue/green/amber/purple), giving the bar a meaningful color
 * signal at a glance.
 */
export default function CategoryFilterChips({
  activeKey,
  onChange,
  counts = {},
  ariaLabel,
  className,
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("relative -mx-4 sm:mx-0", className)}
    >
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto scroll-smooth snap-x px-4 sm:px-0 md:flex-wrap md:overflow-visible">
        <Chip
          active={activeKey === "all"}
          activeClass="bg-warm-cardDark text-warm-line border-warm-borderMuted"
          onClick={() => onChange?.("all")}
        >
          All
          {typeof counts.all === "number" && (
            <span className="text-warm-300">·{" "}{counts.all}</span>
          )}
        </Chip>

        {ACTIVITY_CATEGORIES.map((cat) => {
          const active = activeKey === cat.slug;
          const style = ACTIVITY_CATEGORY_STYLES[cat.slug];
          return (
            <Chip
              key={cat.slug}
              active={active}
              activeClass={cn(
                style.chipBg,
                style.chipText,
                "border-transparent"
              )}
              onClick={() => onChange?.(cat.slug)}
            >
              <Icon icon={cat.icon} className="w-3.5 h-3.5" aria-hidden />
              {cat.label}
              {typeof counts[cat.slug] === "number" && (
                <span className={active ? "opacity-70" : "text-warm-300"}>
                  · {counts[cat.slug]}
                </span>
              )}
            </Chip>
          );
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-paper-dark to-transparent md:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-paper-dark to-transparent md:hidden"
      />
    </div>
  );
}
