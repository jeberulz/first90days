"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Underline-style tabs. Text-only with an accent underline on the active tab.
 * Use for primary mode switches (e.g. status filter) where pill chips would
 * be too visually heavy and a segmented control would be too rigid.
 *
 * Implements the standard WAI-ARIA tab pattern: roving tabIndex (only the
 * active tab is in the tab order), and ArrowLeft / ArrowRight / Home / End
 * move focus + activate the adjacent tab.
 */
export default function UnderlineTabs({
  items,
  activeKey,
  onChange,
  ariaLabel,
  className,
}) {
  const tabRefs = useRef([]);

  function focusTab(index) {
    const next = items[index];
    if (!next) return;
    onChange?.(next.key);
    // Defer to let the active state re-render before moving focus.
    requestAnimationFrame(() => {
      tabRefs.current[index]?.focus();
    });
  }

  function handleKeyDown(e, index) {
    if (!items.length) return;
    const last = items.length - 1;
    let nextIndex = null;
    switch (e.key) {
      case "ArrowRight":
        nextIndex = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
        nextIndex = index === 0 ? last : index - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    focusTab(nextIndex);
  }

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
        {items.map((tab, index) => {
          const active = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange?.(tab.key)}
              onKeyDown={(e) => handleKeyDown(e, index)}
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
