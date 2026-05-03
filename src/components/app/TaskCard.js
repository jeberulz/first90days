"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  getCategoryMeta,
  getCategoryStyle,
} from "@/lib/activityCategories";

export function CategoryChip({ category, size = "sm" }) {
  const meta = getCategoryMeta(category);
  const style = getCategoryStyle(category);
  const sizing =
    size === "md"
      ? "px-2.5 py-1 text-[12px]"
      : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizing,
        style.chipBg,
        style.chipText
      )}
    >
      <Icon
        icon={meta.icon}
        className="w-3 h-3"
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

function StatusCheckbox({ status, justCompleted, onClick }) {
  if (status === "skipped") {
    return (
      <span
        className="mt-0.5 sm:mt-0 w-5 h-5 rounded bg-warm-surfaceDark flex items-center justify-center flex-shrink-0"
        aria-label="Skipped"
      >
        <span className="text-warm-300 text-xs leading-none">—</span>
      </span>
    );
  }

  if (status === "completed" || justCompleted) {
    return (
      <span
        className={cn(
          "mt-0.5 sm:mt-0 w-5 h-5 rounded bg-accent flex items-center justify-center flex-shrink-0 transition-transform duration-200",
          justCompleted &&
            "scale-110 motion-safe:animate-pulse-glow"
        )}
        aria-label="Completed"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M2 6l3 3 5-5" />
        </svg>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label="Complete activity"
      className="mt-0.5 sm:mt-0 w-5 h-5 rounded border-2 border-warm-borderMuted hover:border-accent transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    />
  );
}

function IconAction({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={label}
      className="p-1.5 rounded-md text-warm-300 hover:bg-warm-surfaceDark hover:text-warm-line transition-colors"
    >
      <Icon icon={icon} className="w-4 h-4" />
    </button>
  );
}

export default function TaskCard({
  activity,
  index = 0,
  onComplete,
  onSkip,
  onReschedule,
  onOpen,
}) {
  const style = getCategoryStyle(activity.category);
  const isDone = activity.status === "completed";
  const isSkipped = activity.status === "skipped";
  const [justCompleted, setJustCompleted] = useState(false);

  function handleComplete() {
    if (isDone || justCompleted) return;
    setJustCompleted(true);
    setTimeout(() => {
      onComplete?.(activity);
    }, 600);
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(activity)}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      className={cn(
        "group w-full text-left bg-warm-cardDark border border-warm-borderDark rounded-xl",
        "p-4 border-l-4 transition-all duration-200",
        "hover:border-warm-borderMuted hover:bg-warm-surfaceDark/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "motion-safe:animate-fade-in-up",
        style.borderL,
        (isDone || isSkipped) && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <StatusCheckbox
          status={activity.status}
          justCompleted={justCompleted}
          onClick={handleComplete}
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-space-grotesk text-[15px] leading-snug",
              isDone
                ? "text-warm-300 line-through decoration-warm-borderMuted"
                : "text-warm-line font-medium"
            )}
          >
            {activity.title}
          </p>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <CategoryChip category={activity.category} />
            <span className="font-space-grotesk text-[11px] text-warm-300">
              W{activity.weekNumber}
            </span>
            {activity.estimatedTime && (
              <>
                <span
                  aria-hidden
                  className="w-1 h-1 rounded-full bg-warm-borderMuted"
                />
                <span className="font-space-grotesk text-[11px] text-warm-300">
                  {activity.estimatedTime}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="hidden sm:flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {!isDone && !isSkipped && (
            <>
              <IconAction
                icon="solar:calendar-linear"
                label="Reschedule"
                onClick={() => onReschedule?.(activity)}
              />
              <IconAction
                icon="solar:close-circle-linear"
                label="Skip"
                onClick={() => onSkip?.(activity)}
              />
            </>
          )}
        </div>
      </div>
    </button>
  );
}
