"use client";

import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function DashboardPage() {
  const user = useQuery(api.users.viewer);
  const dayInfo = useQuery(api.users.getDayNumber);
  const plan = useQuery(api.plans.get);
  const goals = useQuery(api.goals.list);
  const stakeholders = useQuery(api.stakeholders.list);
  const seedPlan = useMutation(api.seed.seedJohnsPlan);

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
          Welcome to your First 90 Days
        </h1>
        <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
          {user.name ? `Hi ${user.name.split(" ")[0]}, ` : ""}
          {dayInfo
            ? `you're on Day ${dayInfo.dayNumber} — ${dayInfo.phaseName} phase`
            : "let's get started"}
        </p>
      </div>

      {/* No plan state */}
      {!plan && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center space-y-4">
          <h2 className="font-instrument-serif text-2xl">
            Ready to build your plan?
          </h2>
          <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md mx-auto">
            {user.isPilotUser
              ? "Load your pre-built pilot workspace (same data as first-time signup)."
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
              <a
                href="/onboarding/1"
                className="inline-flex bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm"
              >
                Continue setup
              </a>
            )}
          </div>
        </div>
      )}

      {/* Plan overview */}
      {plan && dayInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Onboarding Journey Progress */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 col-span-full">
            <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-4">
              Onboarding Journey
            </h3>
            <div className="flex items-center gap-2 mb-3">
              {[
                { name: "Learn", days: "Days 1-30", active: dayInfo.phase >= 1 },
                { name: "Contribute", days: "Days 31-60", active: dayInfo.phase >= 2 },
                { name: "Lead", days: "Days 61-90", active: dayInfo.phase >= 3 },
              ].map((phase, i) => (
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
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
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
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
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
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
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
        </div>
      )}

      {/* Goals list */}
      {goals && goals.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
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
                <div>
                  <p className="font-space-grotesk text-sm text-[#E7E5E4]">
                    {goal.title}
                  </p>
                  <p className="font-space-grotesk text-xs text-[#A8A29E]">
                    Phase {goal.targetPhase} · {goal.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key stakeholders */}
      {stakeholders && stakeholders.length > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
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
    </div>
  );
}
