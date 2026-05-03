"use client";

import Link from "next/link";

function LegendDot({ swatch, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-warm-300">
      <span
        aria-hidden
        className={`w-2 h-2 rounded-full ${swatch}`}
      />
      {label}
    </span>
  );
}

export default function TaskProgressStrip({
  completed,
  upcoming,
  skipped,
  total,
  todayDone,
  todayTotal,
}) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const completedPct = total ? (completed / total) * 100 : 0;
  const skippedPct = total ? (skipped / total) * 100 : 0;
  const showTodayPeek =
    typeof todayTotal === "number" && todayTotal > 0;

  return (
    <section
      aria-label="Plan progress"
      className="bg-warm-cardDark border border-warm-borderDark rounded-2xl p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-meta text-warm-300">Plan progress</p>
          <p className="font-instrument-serif leading-none text-4xl sm:text-5xl text-warm-line mt-2">
            {pct}
            <span className="text-warm-300 text-2xl sm:text-3xl">%</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="font-space-grotesk text-sm text-warm-300">
            <span className="text-warm-line font-medium">{completed}</span>
            <span className="mx-1">/</span>
            {total}
          </p>
          {showTodayPeek && (
            <Link
              href="/today"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warm-surfaceDark hover:bg-warm-borderMuted transition-colors font-space-grotesk text-xs text-warm-line"
            >
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full bg-accent motion-safe:animate-pulse"
              />
              Today {todayDone}/{todayTotal}
            </Link>
          )}
        </div>
      </div>

      <div
        className="mt-4 h-2 w-full rounded-full bg-warm-surfaceDark overflow-hidden flex"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${completedPct}%` }}
          aria-hidden
        />
        <div
          className="h-full bg-warm-borderMuted transition-[width] duration-500"
          style={{ width: `${skippedPct}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-space-grotesk text-xs">
        <LegendDot swatch="bg-accent" label={`Completed ${completed}`} />
        <LegendDot swatch="bg-warm-300" label={`Upcoming ${upcoming}`} />
        <LegendDot
          swatch="bg-warm-borderMuted"
          label={`Skipped ${skipped}`}
        />
      </div>
    </section>
  );
}
