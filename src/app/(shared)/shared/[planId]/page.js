"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import CommentThread from "@/components/plan/CommentThread";

const phaseLabels = {
  1: { name: "Learn", desc: "Absorb context", days: "Days 1-30" },
  2: { name: "Contribute", desc: "Deliver value", days: "Days 31-60" },
  3: { name: "Lead", desc: "Own outcomes", days: "Days 61-90" },
};

/**
 * Read-only manager view of a plan that has been shared with the current
 * user. Mirrors the shape of /plan but with a header that names the plan
 * owner, no edit affordances, and the same comment threads at plan / week
 * scope so the manager can leave feedback.
 */
export default function SharedPlanPage({ params }) {
  const { planId } = use(params);
  const plan = useQuery(api.plans.getSharedFull, { planId });
  const planComments = useQuery(api.planComments.listForPlan, { planId });

  if (plan === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-2/3" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (plan === null) {
    return (
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
        <h1 className="font-instrument-serif text-2xl">Plan not available</h1>
        <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E]">
          You don&apos;t have access to this plan, or the owner has revoked
          your access.
        </p>
        <Link
          href="/plan"
          className="inline-block mt-4 font-space-grotesk text-sm text-[#D97757] hover:underline"
        >
          ← Back to your workspace
        </Link>
      </div>
    );
  }

  const weekActivities = {};
  for (const a of plan.activities) {
    if (!weekActivities[a.weekNumber]) weekActivities[a.weekNumber] = [];
    weekActivities[a.weekNumber].push(a);
  }

  return (
    <div className="space-y-8">
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
          Reviewing
        </p>
        <h1 className="mt-1 font-instrument-serif text-3xl text-[#E7E5E4]">
          {plan.ownerName || plan.ownerEmail || "First90 plan"}
          {plan.roleTitle ? ` · ${plan.roleTitle}` : ""}
        </h1>
        {(plan.companyName || plan.startDate) && (
          <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E]">
            {plan.companyName}
            {plan.companyName && plan.startDate ? " · " : ""}
            {plan.startDate ? `Starts ${plan.startDate}` : ""}
          </p>
        )}
        <p className="mt-3 font-space-grotesk text-xs text-[#78716C]">
          You can read everything in this plan and leave comments. Only the
          owner can edit activities or change the schedule.
        </p>
      </div>

      {plan.goals && plan.goals.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
          <h2 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-4">
            Goals
          </h2>
          <ul className="space-y-3">
            {plan.goals.map((g) => (
              <li key={g._id}>
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                      g.status === "completed"
                        ? "bg-green-500"
                        : g.status === "in_progress"
                          ? "bg-[#D97757]"
                          : "bg-[#292524] border border-[#44403C]"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="font-space-grotesk text-sm text-[#E7E5E4]">
                      {g.title}
                    </p>
                    <p className="font-space-grotesk text-xs text-[#A8A29E]">
                      Phase {g.targetPhase} · {g.category}
                    </p>
                    <CommentThread
                      planId={plan._id}
                      targetType="goal"
                      targetId={g._id}
                      compact
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phases & weeks */}
      {plan.phases.map((phase) => {
        const phaseWeeks = plan.weeks.filter((w) => w.phaseId === phase._id);
        return (
          <div key={phase._id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#44403C]" />
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

                return (
                  <Link
                    key={week._id}
                    href={`/shared/${plan._id}/week/${week.number}`}
                    className="block bg-[#1C1917] border border-[#2C2825] hover:border-[#44403C] rounded-xl p-5 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-space-grotesk text-xs text-[#A8A29E]">
                          Week {week.number}
                        </span>
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

      {/* Plan-level comment thread */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <h2 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
          Plan-level discussion
        </h2>
        <CommentThread
          planId={plan._id}
          targetType="plan"
          targetId={plan._id}
        />
      </div>

      {planComments && planComments.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
          <h2 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
            Recent activity
          </h2>
          <ul className="space-y-2">
            {planComments.slice(0, 8).map((c) => (
              <li
                key={c._id}
                className="font-space-grotesk text-xs text-[#A8A29E]"
              >
                <span className="text-[#E7E5E4]">{c.authorName || "Someone"}</span>{" "}
                commented on a {c.targetType}
                {c.resolvedAt ? " (resolved)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
