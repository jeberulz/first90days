"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import {
  GoalApprovalBadge,
  GoalApprovalActions,
} from "@/components/plan/GoalApproval";

const PRE_BOARDING_CHECKLIST = [
  { id: "news", label: "Research company recent news, earnings, product launches" },
  { id: "culture", label: "Read Glassdoor / Blind reviews for culture signals" },
  { id: "linkedin", label: "Connect with future manager on LinkedIn — send intro message" },
  { id: "workspace", label: "Set up your workspace (laptop, tools, badge if remote)" },
  { id: "learning", label: "Draft your \"learning agenda\" — 5 questions you want answered by day 30" },
  { id: "people", label: "Identify 3 people you want to meet in week 1" },
  { id: "stars", label: "Review your STARS situation and what it means for your approach" },
];

function useChecklistState() {
  const [checked, setChecked] = useState({});
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && typeof window !== "undefined") {
    setHydrated(true);
    try {
      const stored = localStorage.getItem("preboarding_checklist");
      if (stored) setChecked(JSON.parse(stored));
    } catch {}
  }

  function toggle(id) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("preboarding_checklist", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return { checked, toggle };
}

function formatStartDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const user = useQuery(api.users.viewer);
  const dayInfo = useQuery(api.users.getDayNumber);
  const plan = useQuery(api.plans.get);
  const goals = useQuery(api.goals.list);
  const stakeholders = useQuery(api.stakeholders.list);
  const seedPlan = useMutation(api.seed.seedJohnsPlan);
  const resetAndReseed = useMutation(api.seed.resetAndReseed);
  const reconcilePilotPlanSchedule = useMutation(api.seed.reconcilePilotPlanSchedule);
  const [resetting, setResetting] = useState(false);
  const [pilotSyncing, setPilotSyncing] = useState(false);
  const { checked, toggle } = useChecklistState();

  if (!user) return null;

  const preBoarding = plan && dayInfo && !dayInfo.hasStarted;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
          {preBoarding
            ? "Preparing for Day 1"
            : "Welcome to your First 90 Days"}
        </h1>
        <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
          {user.name ? `Hi ${user.name.split(" ")[0]}, ` : ""}
          {preBoarding
            ? `your journey begins on ${formatStartDate(dayInfo.startDate)}`
            : dayInfo && dayInfo.hasStarted
              ? `you're on Day ${dayInfo.dayNumber} — ${dayInfo.phaseName} phase`
              : "complete onboarding to generate your personalised plan"}
        </p>
      </div>

      {/* Plan is generating — show loading state */}
      {plan?.status === "generating" && (
        <div className="bg-[#1C1917] border border-[#D97757]/30 rounded-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#D97757]/10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="font-instrument-serif text-2xl text-[#E7E5E4]">
            Building your plan&hellip;
          </h2>
          <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md mx-auto">
            We&apos;re generating your personalised 90-day plan. This usually takes 30&ndash;60 seconds.
            You can wait here &mdash; the page will update automatically.
          </p>
          <div className="w-48 mx-auto h-1.5 bg-[#292524] rounded-full overflow-hidden">
            <div className="h-full bg-[#D97757] rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Plan generation failed — show error with retry */}
      {plan?.status === "failed" && (
        <div className="bg-[#1C1917] border border-red-900/40 rounded-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-900/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 className="font-instrument-serif text-2xl text-red-400">
            Plan generation failed
          </h2>
          <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md mx-auto">
            Something went wrong while building your plan. Your information is saved &mdash;
            click below to try again.
          </p>
          <Link
            href={user.lastOnboardingStep != null ? `/onboarding/${Math.min(user.lastOnboardingStep + 2, 6)}` : "/onboarding/6"}
            className="inline-flex bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm"
          >
            Try again
          </Link>
        </div>
      )}

      {/* No plan state */}
      {!plan && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 sm:p-8 text-center space-y-4">
          <h2 className="font-instrument-serif text-2xl">
            Ready to build your plan?
          </h2>
          <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md mx-auto">
            {user.isPilotUser
              ? "Load your pre-built pilot workspace (same data as first-time signup). If you already have a plan, Load sample syncs dates to the pilot start calendar."
              : user.partialOnboarding?.companyName
                ? `Continue setup to build your plan at ${user.partialOnboarding.companyName}.`
                : "Continue setup to generate a personalised 90-day plan tailored to your role."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user.isPilotUser && (
              <button
                type="button"
                onClick={() => seedPlan()}
                className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm"
              >
                Load sample plan
              </button>
            )}
            {!user.isPilotUser && (
              <Link
                href={user.lastOnboardingStep != null ? `/onboarding/${Math.min(user.lastOnboardingStep + 2, 6)}` : "/onboarding/1"}
                className="inline-flex bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm"
              >
                Continue setup
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Pre-boarding state ── */}
      {preBoarding && (
        <>
          {/* Countdown hero */}
          <div className="bg-gradient-to-br from-[#1C1917] to-[#292524] border border-[#2C2825] rounded-xl p-6 sm:p-8 text-center">
            <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-2">
              Your journey begins in
            </p>
            <p className="t-countdown text-[#D97757]">
              {dayInfo.daysUntilStart}
            </p>
            <p className="mt-2 font-instrument-serif text-lg sm:text-xl text-[#E7E5E4]">
              {dayInfo.daysUntilStart === 1 ? "day" : "days"}
            </p>
            <p className="mt-3 font-space-grotesk text-sm text-[#A8A29E]">
              {formatStartDate(dayInfo.startDate)}
            </p>
          </div>

          {/* Phase bar — all grayed out */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6">
            <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-4">
              Onboarding Journey
            </h3>
            <div className="flex items-center gap-2 mb-3">
              {[
                { name: "Pre-boarding", days: `T-${dayInfo.daysUntilStart}`, active: true },
                { name: "Learn", days: "Days 1-30", active: false },
                { name: "Contribute", days: "Days 31-60", active: false },
                { name: "Lead", days: "Days 61-90", active: false },
              ].map((phase) => (
                <div key={phase.name} className="flex-1">
                  <div
                    className={`h-1 rounded-full ${
                      phase.active ? "bg-[#D97757]" : "bg-[#292524]"
                    }`}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-space-grotesk text-xs font-medium text-[#E7E5E4]">
                      {phase.name}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#A8A29E]">
                      {phase.days}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-boarding checklist */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6">
            <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-1">
              Pre-Boarding Checklist
            </h3>
            <p className="font-space-grotesk text-xs text-[#57534E] mb-4">
              Get a head start before Day 1. Progress saves locally.
            </p>
            <div className="space-y-3">
              {PRE_BOARDING_CHECKLIST.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 transition-colors flex items-center justify-center ${
                      checked[item.id]
                        ? "bg-[#D97757] border-[#D97757]"
                        : "border-[#44403C] group-hover:border-[#D97757]"
                    }`}
                  >
                    {checked[item.id] && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`font-space-grotesk text-sm ${
                      checked[item.id]
                        ? "text-[#A8A29E] line-through"
                        : "text-[#E7E5E4]"
                    }`}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-4 font-space-grotesk text-xs text-[#57534E]">
              {Object.values(checked).filter(Boolean).length} /{" "}
              {PRE_BOARDING_CHECKLIST.length} completed
            </p>
          </div>

          {/* Reset workspace (pilot only) */}
          {user.isPilotUser && (
            <div className="flex items-center justify-between bg-[#1C1917] border border-[#2C2825] rounded-xl p-4">
              <div>
                <p className="font-space-grotesk text-sm text-[#E7E5E4]">
                  Reset workspace
                </p>
                <p className="font-space-grotesk text-xs text-[#57534E]">
                  Wipe all data and re-seed from scratch (pilot only).
                </p>
              </div>
              <button
                type="button"
                disabled={resetting}
                onClick={async () => {
                  if (!confirm("This deletes all your data and re-seeds. Continue?"))
                    return;
                  setResetting(true);
                  try {
                    await resetAndReseed();
                  } finally {
                    setResetting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-[#44403C] font-space-grotesk text-xs text-[#A8A29E] hover:bg-[#292524] hover:text-[#E7E5E4] transition disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Reset & re-seed"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Active plan state ── */}
      {plan && dayInfo && dayInfo.hasStarted && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Onboarding Journey Progress */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6 col-span-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
                Onboarding Journey
              </h3>
              <Link
                href="/progress"
                className="font-space-grotesk text-xs text-[#D97757] hover:text-[#C26242] transition"
              >
                View full progress →
              </Link>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {[
                { name: "Learn", days: "Days 1-30", active: dayInfo.phase >= 1 },
                { name: "Contribute", days: "Days 31-60", active: dayInfo.phase >= 2 },
                { name: "Lead", days: "Days 61-90", active: dayInfo.phase >= 3 },
              ].map((phase) => (
                <div key={phase.name} className="flex-1">
                  <div
                    className={`h-1 rounded-full ${
                      phase.active ? "bg-[#D97757]" : "bg-[#292524]"
                    }`}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-space-grotesk text-xs font-medium text-[#E7E5E4]">
                      {phase.name}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#A8A29E]">
                      {phase.days}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day counter */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6">
            <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
              Current Day
            </p>
            <p className="mt-2 font-instrument-serif text-3xl text-[#D97757]">
              {dayInfo.dayNumber}
              <span className="text-lg text-[#A8A29E]"> / 90</span>
            </p>
            <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
              Week {dayInfo.weekNumber} · {dayInfo.phaseName} Phase
            </p>
          </div>

          {/* Goals */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6">
            <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
              Goals
            </p>
            <p className="mt-2 font-instrument-serif text-3xl text-[#E7E5E4]">
              {goals ? goals.filter((g) => g.status === "completed").length : 0}
              <span className="text-lg text-[#A8A29E]">
                {" "}
                / {goals ? goals.length : 0}
              </span>
            </p>
            <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
              Completed
            </p>
          </div>

          {/* Stakeholders */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6">
            <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
              Key Stakeholders
            </p>
            <p className="mt-2 font-instrument-serif text-3xl text-[#E7E5E4]">
              {stakeholders ? stakeholders.length : 0}
            </p>
            <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
              {stakeholders
                ? `${stakeholders.filter((s) => s.health === "green").length} healthy`
                : ""}
            </p>
          </div>

          {/* Reset workspace (pilot, active plan) */}
          {user.isPilotUser && (
            <div className="col-span-full flex items-center justify-between bg-[#1C1917] border border-[#2C2825] rounded-xl p-4">
              <div>
                <p className="font-space-grotesk text-sm text-[#E7E5E4]">
                  Reset workspace
                </p>
                <p className="font-space-grotesk text-xs text-[#57534E]">
                  Wipe all data and re-seed from scratch (pilot only).
                </p>
              </div>
              <button
                type="button"
                disabled={resetting}
                onClick={async () => {
                  if (!confirm("This deletes all your data and re-seeds. Continue?"))
                    return;
                  setResetting(true);
                  try {
                    await resetAndReseed();
                  } finally {
                    setResetting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-[#44403C] font-space-grotesk text-xs text-[#A8A29E] hover:bg-[#292524] hover:text-[#E7E5E4] transition disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Reset & re-seed"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Goals list */}
      {goals && goals.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6">
          <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-4">
            Your Goals
          </h3>
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal._id}
                className="flex items-start gap-3 py-2"
              >
                <div
                  className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                    goal.status === "completed"
                      ? "bg-green-500"
                      : goal.status === "in_progress"
                        ? "bg-[#D97757]"
                        : "bg-[#292524] border border-[#44403C]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-space-grotesk text-sm text-[#E7E5E4]">
                      {goal.title}
                    </p>
                    <GoalApprovalBadge goal={goal} />
                  </div>
                  <p className="font-space-grotesk text-xs text-[#A8A29E]">
                    Phase {goal.targetPhase} · {goal.category}
                  </p>
                  <GoalApprovalActions goal={goal} viewerRole="owner" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key stakeholders */}
      {stakeholders && stakeholders.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-6">
          <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-4">
            Key Stakeholders
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stakeholders.slice(0, 6).map((s) => (
              <div
                key={s._id}
                className="flex items-center gap-3 bg-[#292524]/50 rounded-lg p-3"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium font-space-grotesk">
                    {s.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-space-grotesk text-sm text-[#E7E5E4] truncate">
                    {s.name}
                  </p>
                  <p className="font-space-grotesk text-xs text-[#A8A29E] truncate">
                    {s.role}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium font-space-grotesk ${
                    s.relationshipType === "Champion"
                      ? "bg-[#D97757] text-white"
                      : s.relationshipType === "Decider"
                        ? "bg-[#D97757]/80 text-white"
                        : "bg-[#292524] text-[#A8A29E] border border-[#44403C]"
                  }`}
                >
                  {s.relationshipType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {user.isPilotUser && plan && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#1C1917] border border-[#44403C] rounded-xl p-4">
          <div>
            <p className="font-space-grotesk text-sm text-[#E7E5E4]">
              Pilot calendar sync
            </p>
            <p className="font-space-grotesk text-xs text-[#57534E]">
              Align onboarding start date and all tasks with a scheduled day to the pilot anchor (May 11, 2026).
            </p>
          </div>
          <button
            type="button"
            disabled={pilotSyncing}
            onClick={async () => {
              setPilotSyncing(true);
              try {
                await reconcilePilotPlanSchedule();
              } finally {
                setPilotSyncing(false);
              }
            }}
            className="shrink-0 px-4 py-2 rounded-lg border border-[#44403C] font-space-grotesk text-xs text-[#A8A29E] hover:bg-[#292524] hover:text-[#E7E5E4] transition disabled:opacity-50"
          >
            {pilotSyncing ? "Syncing…" : "Sync pilot calendar"}
          </button>
        </div>
      )}
    </div>
  );
}
