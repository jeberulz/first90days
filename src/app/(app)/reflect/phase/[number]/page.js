"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { use } from "react";
import Link from "next/link";

const phaseInfo = {
  1: { name: "Learn", days: "Days 1-30" },
  2: { name: "Contribute", days: "Days 31-60" },
  3: { name: "Lead", days: "Days 61-90" },
};

export default function PhaseReviewPage({ params }) {
  const { number } = use(params);
  const phaseNum = parseInt(number, 10);
  const goals = useQuery(api.goals.list);
  const allActivities = useQuery(api.activities.getAll);
  const stakeholders = useQuery(api.stakeholders.list);
  const logEntries = useQuery(api.logEntries.list, {});

  if (!goals || !allActivities || !stakeholders || !logEntries) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const phase = phaseInfo[phaseNum];
  const phaseGoals = goals.filter((g) => g.targetPhase === phaseNum);
  const startWeek = (phaseNum - 1) * 4 + 1;
  const endWeek = phaseNum * 4;
  const phaseActivities = allActivities.filter(
    (a) => a.weekNumber >= startWeek && a.weekNumber <= endWeek
  );
  const completed = phaseActivities.filter((a) => a.status === "completed");
  const wins = logEntries.filter((e) => e.type === "win");
  const learnings = logEntries.filter((e) => e.type === "learning");

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link
        href="/dashboard"
        className="font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] transition inline-block"
      >
        ← Back to dashboard
      </Link>

      <div>
        <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
          Phase {phaseNum} Review: {phase?.name}
        </h1>
        <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
          {phase?.days}
        </p>
      </div>

      {/* Activity summary */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
          What I Did
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="font-instrument-serif text-2xl text-[#E7E5E4]">
              {completed.length}
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E]">completed</p>
          </div>
          <div>
            <p className="font-instrument-serif text-2xl text-[#A8A29E]">
              {phaseActivities.length}
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E]">planned</p>
          </div>
          <div>
            <p className="font-instrument-serif text-2xl text-[#D97757]">
              {phaseActivities.length > 0
                ? Math.round((completed.length / phaseActivities.length) * 100)
                : 0}%
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E]">rate</p>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
          Goals for This Phase
        </h3>
        {phaseGoals.length === 0 ? (
          <p className="font-space-grotesk text-sm text-[#57534E]">No goals set for this phase.</p>
        ) : (
          <div className="space-y-3">
            {phaseGoals.map((goal) => (
              <div key={goal._id} className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    goal.status === "completed" ? "bg-green-500" : "bg-[#292524] border border-[#44403C]"
                  }`}
                />
                <p className="font-space-grotesk text-sm text-[#E7E5E4]">{goal.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relationships */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
          Relationships Built
        </h3>
        <p className="font-space-grotesk text-sm text-[#E7E5E4]">
          {stakeholders.length} stakeholders tracked ·{" "}
          {stakeholders.filter((s) => s.health === "green").length} healthy
        </p>
      </div>

      {/* Wins & Learnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
          <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
            🏆 Wins ({wins.length})
          </h3>
          <div className="space-y-2">
            {wins.slice(0, 5).map((w) => (
              <p key={w._id} className="font-space-grotesk text-sm text-[#E7E5E4]">
                {w.title}
              </p>
            ))}
            {wins.length === 0 && (
              <p className="font-space-grotesk text-sm text-[#57534E]">No wins logged yet.</p>
            )}
          </div>
        </div>
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
          <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
            💡 Learnings ({learnings.length})
          </h3>
          <div className="space-y-2">
            {learnings.slice(0, 5).map((l) => (
              <p key={l._id} className="font-space-grotesk text-sm text-[#E7E5E4]">
                {l.title}
              </p>
            ))}
            {learnings.length === 0 && (
              <p className="font-space-grotesk text-sm text-[#57534E]">No learnings logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
