"use client";

import { cn } from "@/lib/utils";

export default function ScrollableTabs({
  items,
  activeKey,
  onChange,
  ariaLabel,
  fadeColor = "from-paper-dark",
  className,
}) {
  return (
    <div className={cn("relative -mx-4 sm:mx-0", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 sm:px-0 md:flex-wrap md:overflow-visible"
      >
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
                "snap-start shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-space-grotesk text-sm transition-colors min-h-11",
                active
                  ? "bg-accent text-white border-accent"
                  : "bg-warm-cardDark text-warm-300 border-warm-borderDark hover:text-warm-line"
              )}
            >
              {tab.icon && (
                <span className="mr-1.5 inline-block align-[-2px]">
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r to-transparent md:hidden",
          fadeColor
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l to-transparent md:hidden",
          fadeColor
        )}
      />
    </div>
  );
}
