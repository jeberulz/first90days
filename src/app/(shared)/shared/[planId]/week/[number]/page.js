"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import CommentThread from "@/components/plan/CommentThread";

const categoryColors = {
  learning: { border: "border-l-blue-500", text: "text-blue-400" },
  shipping: { border: "border-l-green-500", text: "text-green-400" },
  relationships: { border: "border-l-amber-500", text: "text-amber-400" },
  influence: { border: "border-l-purple-500", text: "text-purple-400" },
};

/**
 * Read-only week detail for a shared plan. Same shape as the owner's
 * /plan/week/[number] page minus the edit/skip/delete affordances. The
 * manager can comment on each activity.
 */
export default function SharedWeekPage({ params }) {
  const { planId, number } = use(params);
  const weekNumber = parseInt(number, 10);
  const data = useQuery(api.plans.getSharedWeekActivities, {
    planId,
    weekNumber,
  });

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
        <p className="font-instrument-serif text-xl text-[#E7E5E4]">
          Week not available
        </p>
      </div>
    );
  }

  const { week, activities } = data;
  const byDay = {};
  for (const a of activities) {
    const day = a.scheduledDay || 0;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(a);
  }
  const sortedDays = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);
  const completed = activities.filter((a) => a.status === "completed").length;
  const total = activities.length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/shared/${planId}`}
          className="font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] transition mb-4 inline-block"
        >
          ← Back to plan
        </Link>
        <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
          Week {weekNumber}: {week?.theme || ""}
        </h1>
        <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
          {completed} of {total} activities completed
        </p>
        {total > 0 && (
          <div className="mt-3 w-full max-w-xs h-1.5 bg-[#292524] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D97757] rounded-full transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {week?.reflectionPrompt && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs font-medium text-[#A8A29E] mb-1">
            Reflection Prompt
          </p>
          <p className="font-instrument-serif text-lg text-[#E7E5E4]">
            {week.reflectionPrompt}
          </p>
          {week && (
            <div className="mt-4 pt-4 border-t border-[#2C2825]">
              <CommentThread
                planId={planId}
                targetType="week"
                targetId={week._id}
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {sortedDays.map((day) => (
          <div key={day}>
            <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
              Day {day}
            </h3>
            <div className="space-y-2">
              {byDay[day].map((activity) => {
                const colors =
                  categoryColors[activity.category] || categoryColors.learning;
                const isDone = activity.status === "completed";
                const isSkipped = activity.status === "skipped";
                return (
                  <div
                    key={activity._id}
                    className={`bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 border-l-4 ${colors.border} ${
                      isDone || isSkipped ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded border-2 border-[#44403C] flex-shrink-0 flex items-center justify-center">
                        {isDone && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#D97757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                        {isSkipped && (
                          <span className="text-[#A8A29E] text-xs">—</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-space-grotesk text-sm font-medium ${
                            isDone
                              ? "text-[#A8A29E] line-through"
                              : "text-[#E7E5E4]"
                          }`}
                        >
                          {activity.title}
                        </p>
                        <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
                          {activity.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span
                            className={`font-space-grotesk text-xs ${colors.text}`}
                          >
                            {activity.category}
                          </span>
                          <span className="font-space-grotesk text-xs text-[#A8A29E]">
                            {activity.estimatedTime}
                          </span>
                          <span className="font-space-grotesk text-xs text-[#A8A29E]">
                            {activity.priority}
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#2C2825]">
                          <CommentThread
                            planId={planId}
                            targetType="activity"
                            targetId={activity._id}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
