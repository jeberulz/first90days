"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import SharePlanModal from "@/components/plan/SharePlanModal";

const phaseLabels = {
  1: { name: "Learn", desc: "Absorb context", days: "Days 1-30" },
  2: { name: "Contribute", desc: "Deliver value", days: "Days 31-60" },
  3: { name: "Lead", desc: "Own outcomes", days: "Days 61-90" },
};

export default function PlanPage() {
  const fullPlan = useQuery(api.plans.getFull);
  const dayInfo = useQuery(api.users.getDayNumber);
  const collaborators = useQuery(
    api.collaboration.listCollaborators,
    fullPlan ? { planId: fullPlan._id } : "skip"
  );
  const sharedWithMe = useQuery(api.collaboration.listSharedWithMe);
  const [shareOpen, setShareOpen] = useState(false);

  if (!fullPlan) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-2/3" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const weekActivities = {};
  for (const a of fullPlan.activities) {
    if (!weekActivities[a.weekNumber]) weekActivities[a.weekNumber] = [];
    weekActivities[a.weekNumber].push(a);
  }

  const preBoarding = dayInfo && !dayInfo.hasStarted;

  function formatStartDate(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
            Your 90-Day Trajectory
          </h1>
          <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
            {fullPlan.activities.length} activities across 12 weeks
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {collaborators && collaborators.length > 0 && (
            <div className="flex -space-x-2">
              {collaborators.slice(0, 3).map((c) => (
                <div
                  key={c._id}
                  title={c.name || c.email || "Collaborator"}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] border-2 border-[#0F0E0D] flex items-center justify-center"
                >
                  <span className="text-white text-[10px] font-medium font-space-grotesk">
                    {(c.name || c.email || "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-[#292524] border-2 border-[#0F0E0D] flex items-center justify-center">
                  <span className="text-[#A8A29E] text-[10px] font-medium font-space-grotesk">
                    +{collaborators.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="font-space-grotesk text-sm px-4 py-2 rounded-lg bg-[#D97757] text-white hover:bg-[#C26242] transition inline-flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="3.5" cy="7" r="1.5" />
              <circle cx="10.5" cy="3.5" r="1.5" />
              <circle cx="10.5" cy="10.5" r="1.5" />
              <path d="M5 6.2l4-2M5 7.8l4 2" />
            </svg>
            Share with manager
          </button>
        </div>
      </div>

      {sharedWithMe && sharedWithMe.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4">
          <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-2">
            Shared with you
          </p>
          <ul className="space-y-1.5">
            {sharedWithMe.map((s) => (
              <li key={s._id}>
                <Link
                  href={`/shared/${s.planId}`}
                  className="font-space-grotesk text-sm text-[#E7E5E4] hover:text-[#D97757] transition"
                >
                  {s.ownerName || s.ownerEmail || "Plan"}
                  {s.roleTitle ? ` · ${s.roleTitle}` : ""}
                  {s.companyName ? ` @ ${s.companyName}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {shareOpen && (
        <SharePlanModal
          planId={fullPlan._id}
          onClose={() => setShareOpen(false)}
        />
      )}

      {preBoarding && (
        <div className="bg-[#D97757]/10 border border-[#D97757]/30 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#D97757" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="10" cy="10" r="9" />
            <path d="M10 6v4M10 14h.01" />
          </svg>
          <p className="font-space-grotesk text-sm text-[#E7E5E4]">
            Your plan starts <span className="font-medium text-[#D97757]">{formatStartDate(dayInfo.startDate)}</span>.
            Activities will appear on Today&apos;s View once you begin. Feel free to review and edit your plan now.
          </p>
        </div>
      )}

      {/* Phase progress */}
      <div className="flex items-center gap-2">
        {fullPlan.phases.map((phase) => (
          <div key={phase._id} className="flex-1">
            <div
              className={`h-1 rounded-full ${
                dayInfo && dayInfo.phase >= phase.number
                  ? "bg-[#D97757]"
                  : "bg-[#292524]"
              }`}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-space-grotesk text-xs font-medium text-[#E7E5E4]">
                {phaseLabels[phase.number]?.name}
              </span>
              <span className="font-space-grotesk text-xs text-[#A8A29E]">
                {phaseLabels[phase.number]?.days}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Weeks by phase */}
      {fullPlan.phases.map((phase) => {
        const phaseWeeks = fullPlan.weeks.filter(
          (w) => w.phaseId === phase._id
        );
        return (
          <div key={phase._id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  dayInfo && dayInfo.phase >= phase.number
                    ? "bg-[#D97757]"
                    : "bg-[#44403C]"
                }`}
              />
              <h2 className="font-space-grotesk text-sm font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
                Phase {phase.number}: {phase.name} ·{" "}
                {phaseLabels[phase.number]?.desc}
              </h2>
            </div>

            <div className="space-y-3 ml-4">
              {phaseWeeks.map((week) => {
                const activities = weekActivities[week.number] || [];
                const completed = activities.filter(
                  (a) => a.status === "completed"
                ).length;
                const total = activities.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                const isCurrent =
                  dayInfo && dayInfo.weekNumber === week.number;

                return (
                  <Link
                    key={week._id}
                    href={`/plan/week/${week.number}`}
                    className={`block bg-[#1C1917] border rounded-xl p-5 transition hover:border-[#44403C] ${
                      isCurrent
                        ? "border-[#D97757]/50 ring-1 ring-[#D97757]/20"
                        : "border-[#2C2825]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-space-grotesk text-xs text-[#A8A29E]">
                            Week {week.number}
                          </span>
                          {isCurrent && (
                            <span className="bg-[#D97757] text-white text-xs font-medium px-2 py-0.5 rounded-full font-space-grotesk">
                              Current
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 font-space-grotesk text-base font-medium text-[#E7E5E4]">
                          {week.theme}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="font-space-grotesk text-sm font-medium text-[#E7E5E4]">
                          {completed}/{total}
                        </span>
                        <p className="font-space-grotesk text-xs text-[#A8A29E]">
                          activities
                        </p>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="mt-3 w-full h-1 bg-[#292524] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D97757] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
