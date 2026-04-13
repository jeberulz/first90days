"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

const categoryLabels = {
  learning: "Learning",
  shipping: "Shipping",
  relationships: "Relationships",
  influence: "Influence",
  other: "Other",
};

const categoryColors = {
  learning: "#60A5FA", // blue-400
  shipping: "#4ADE80", // green-400
  relationships: "#FBBF24", // amber-400
  influence: "#A78BFA", // purple-400
  other: "#A8A29E",
};

const verdictCopy = {
  ahead: {
    label: "Ahead of schedule",
    headline: "You're ahead of the plan.",
    body: "Everything you scheduled through today is done — and then some. Good moment to invest in relationships or take on a stretch task.",
    color: "#4ADE80",
  },
  on_pace: {
    label: "On pace",
    headline: "You're on pace.",
    body: "You're hitting most of what the plan expects. Keep the cadence steady and watch for slippage on high-priority items.",
    color: "#D97757",
  },
  slipping: {
    label: "Slipping",
    headline: "Starting to slip.",
    body: "You're falling a little behind what was scheduled. Triage: skip what's no longer relevant and finish the top-priority ones first.",
    color: "#FBBF24",
  },
  behind: {
    label: "Behind plan",
    headline: "Behind plan — reset expected.",
    body: "A meaningful gap between planned and completed has opened up. Consider a regenerate, or talk to your manager about re-scoping Week priorities.",
    color: "#F87171",
  },
  pre_boarding: {
    label: "Pre-boarding",
    headline: "Your plan hasn't started yet.",
    body: "Velocity kicks in on Day 1. Use this time to research your stakeholders and draft your learning questions.",
    color: "#A8A29E",
  },
};

export default function ProgressPage() {
  const v = useQuery(api.insights.getVelocity);

  if (v === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        <div className="h-40 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        <div className="h-60 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (v === null) {
    return (
      <div className="space-y-6">
        <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
          Progress
        </h1>
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
          <p className="font-instrument-serif text-2xl text-[#E7E5E4]">
            No plan yet
          </p>
          <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E]">
            Finish onboarding to generate a plan — velocity tracking starts the
            moment you have activities scheduled.
          </p>
          <Link
            href="/onboarding/1"
            className="inline-block mt-4 bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition"
          >
            Continue setup →
          </Link>
        </div>
      </div>
    );
  }

  const verdict = verdictCopy[v.paceVerdict] || verdictCopy.on_pace;
  const pacePct = Math.round(v.paceRatio * 100);

  // Max weekly planned count — used to normalize the burn-up bar heights
  // so every week shares a consistent vertical scale.
  const maxWeekly = Math.max(1, ...v.weekly.map((w) => w.planned));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
          Progress &amp; Velocity
        </h1>
        <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
          How you&apos;re tracking against your 90-day plan
        </p>
      </div>

      {/* Pace verdict hero */}
      <div
        className="bg-[#1C1917] border rounded-2xl p-6"
        style={{ borderColor: `${verdict.color}40` }}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <p
              className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px]"
              style={{ color: verdict.color }}
            >
              {verdict.label}
            </p>
            <h2 className="mt-2 font-instrument-serif text-3xl tracking-[-0.6px] text-[#E7E5E4]">
              {verdict.headline}
            </h2>
            <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E] leading-relaxed max-w-xl">
              {verdict.body}
            </p>
          </div>
          {v.hasStarted && (
            <div className="flex items-center gap-5 flex-shrink-0">
              <div className="text-right">
                <p
                  className="font-instrument-serif text-5xl leading-none"
                  style={{ color: verdict.color }}
                >
                  {pacePct}%
                </p>
                <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
                  on-time rate
                </p>
              </div>
              <div className="h-14 w-px bg-[#2C2825]" />
              <div className="text-right">
                <p className="font-instrument-serif text-3xl text-[#E7E5E4] leading-none">
                  {v.completedByToday}
                  <span className="text-lg text-[#A8A29E]">
                    {" "}
                    / {v.scheduledByToday}
                  </span>
                </p>
                <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
                  done / due by today
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly burn-up */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-space-grotesk text-sm font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
              Weekly Burn-Up
            </h3>
            <p className="mt-1 font-space-grotesk text-xs text-[#78716C]">
              Planned vs completed across all 12 weeks
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="flex items-center gap-1.5 font-space-grotesk text-xs text-[#A8A29E]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D97757]" />
              Completed
            </span>
            <span className="flex items-center gap-1.5 font-space-grotesk text-xs text-[#A8A29E]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#44403C]" />
              Planned
            </span>
          </div>
        </div>

        <div className="flex items-end gap-1.5 h-40">
          {v.weekly.map((w) => {
            const plannedPct = (w.planned / maxWeekly) * 100;
            const completedPct =
              w.planned > 0 ? (w.completed / w.planned) * plannedPct : 0;
            return (
              <div
                key={w.weekNumber}
                className="flex-1 flex flex-col items-center justify-end h-full"
                title={`Week ${w.weekNumber}: ${w.completed}/${w.planned} completed${w.skipped > 0 ? ` · ${w.skipped} skipped` : ""}`}
              >
                <div className="w-full flex-1 flex items-end relative">
                  <div
                    className="w-full rounded-t-sm bg-[#292524] relative"
                    style={{ height: `${plannedPct}%` }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-[#D97757] transition-all"
                      style={{
                        height: `${w.planned > 0 ? (w.completed / w.planned) * 100 : 0}%`,
                      }}
                    />
                    {w.isCurrent && (
                      <div className="absolute -inset-px rounded-t-sm ring-1 ring-[#D97757]/60 pointer-events-none" />
                    )}
                  </div>
                </div>
                <p
                  className={`mt-1.5 font-space-grotesk text-[10px] ${
                    w.isCurrent
                      ? "text-[#D97757] font-medium"
                      : w.isPast
                        ? "text-[#A8A29E]"
                        : "text-[#57534E]"
                  }`}
                >
                  W{w.weekNumber}
                </p>
              </div>
            );
          })}
        </div>

        {v.hasStarted && (
          <p className="mt-5 font-space-grotesk text-xs text-[#A8A29E] text-center">
            This week: {v.currentWeekCompleted} of {v.currentWeekPlanned}{" "}
            complete
          </p>
        )}
      </div>

      {/* Phase comparison */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <h3 className="font-space-grotesk text-sm font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-5">
          Phase Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {v.phases.map((p) => (
            <div
              key={p.number}
              className={`rounded-lg p-4 border ${
                p.isCurrent
                  ? "border-[#D97757]/50 bg-[#D97757]/5"
                  : "border-[#2C2825] bg-[#0F0E0D]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
                  Phase {p.number} · {p.name}
                </p>
                {p.isCurrent && (
                  <span className="bg-[#D97757] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full font-space-grotesk">
                    Now
                  </span>
                )}
                {p.isPast && (
                  <span className="text-[#78716C] text-[10px] font-space-grotesk">
                    Done
                  </span>
                )}
              </div>
              <p className="font-instrument-serif text-3xl text-[#E7E5E4] leading-none">
                {p.completed}
                <span className="text-lg text-[#A8A29E]"> / {p.planned}</span>
              </p>
              <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
                Days {p.startDay}-{p.endDay}
              </p>
              <div className="mt-3 w-full h-1.5 bg-[#292524] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D97757] rounded-full transition-all"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <p className="mt-1.5 font-space-grotesk text-xs text-[#A8A29E]">
                {p.pct}% complete
                {p.skipped > 0 && (
                  <span className="text-[#57534E]"> · {p.skipped} skipped</span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Category split */}
      {v.categories.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
          <h3 className="font-space-grotesk text-sm font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-5">
            By Category
          </h3>
          <div className="space-y-4">
            {v.categories.map((c) => {
              const color = categoryColors[c.category] || categoryColors.other;
              const label = categoryLabels[c.category] || c.category;
              return (
                <div key={c.category}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className="font-space-grotesk text-sm font-medium"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#A8A29E]">
                      {c.completed} / {c.planned - c.skipped} ({c.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#292524] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-5 font-space-grotesk text-xs text-[#78716C] leading-relaxed">
            A balanced ramp usually has steady progress across all four
            categories. Heavy skew toward one can be a signal you&apos;re
            ignoring a whole dimension of the role.
          </p>
        </div>
      )}
    </div>
  );
}
