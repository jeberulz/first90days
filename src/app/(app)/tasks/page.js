"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { ScrollableTabs } from "@/components/primitives";
import NoPlanEmptyState from "@/components/app/NoPlanEmptyState";
import { useHasPlan } from "@/hooks/useHasPlan";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "skipped", label: "Skipped" },
];

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "learning", label: "Learning" },
  { key: "shipping", label: "Shipping" },
  { key: "relationships", label: "Relationships" },
  { key: "influence", label: "Influence" },
];

const categoryColors = {
  learning: { border: "border-l-blue-500", text: "text-blue-400" },
  shipping: { border: "border-l-green-500", text: "text-green-400" },
  relationships: { border: "border-l-amber-500", text: "text-amber-400" },
  influence: { border: "border-l-purple-500", text: "text-purple-400" },
};

export default function TasksPage() {
  const allActivities = useQuery(api.activities.getAll);
  const goals = useQuery(api.goals.list);
  const dayInfo = useQuery(api.users.getDayNumber);
  const viewer = useQuery(api.users.viewer);
  const { hasPlan, isGenerating } = useHasPlan();
  const completeActivity = useMutation(api.activities.complete);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  if (!allActivities) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (allActivities.length === 0 && (isGenerating || !hasPlan)) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Tasks & Milestones
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            Your activity tracker
          </p>
        </div>
        {isGenerating ? (
          <div className="bg-[#1C1917] border border-[#D97757]/30 rounded-xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              Your plan is being generated. Tasks will appear here shortly.
            </p>
          </div>
        ) : (
          <NoPlanEmptyState
            heading="Track your progress"
            description="Track and manage every activity in your 90-day plan. Complete onboarding to generate your tasks, grouped by week and category."
            lastOnboardingStep={viewer?.lastOnboardingStep}
            companyName={viewer?.partialOnboarding?.companyName}
          />
        )}
      </div>
    );
  }

  let filtered = allActivities;
  if (filter !== "all") {
    filtered = filtered.filter((a) => a.status === filter);
  }
  if (categoryFilter !== "all") {
    filtered = filtered.filter((a) => a.category === categoryFilter);
  }

  const stats = {
    total: allActivities.length,
    completed: allActivities.filter((a) => a.status === "completed").length,
    upcoming: allActivities.filter((a) => a.status === "upcoming").length,
    skipped: allActivities.filter((a) => a.status === "skipped").length,
  };

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
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
          Tasks & Milestones
        </h1>
        <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
          {stats.completed} of {stats.total} completed
        </p>
      </div>

      {preBoarding && (
        <div className="bg-[#D97757]/10 border border-[#D97757]/30 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#D97757" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="10" cy="10" r="9" />
            <path d="M10 6v4M10 14h.01" />
          </svg>
          <p className="font-space-grotesk text-sm text-[#E7E5E4]">
            Your plan starts <span className="font-medium text-[#D97757]">{formatStartDate(dayInfo.startDate)}</span>.
            Activities will appear on Today&apos;s View once you begin.
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-[#E7E5E4]" },
          { label: "Completed", value: stats.completed, color: "text-green-400" },
          { label: "Upcoming", value: stats.upcoming, color: "text-[#D97757]" },
          { label: "Skipped", value: stats.skipped, color: "text-[#A8A29E]" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4">
            <p className="font-space-grotesk text-xs text-[#A8A29E]">{stat.label}</p>
            <p className={`font-instrument-serif text-2xl ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <ScrollableTabs
          items={STATUS_TABS}
          activeKey={filter}
          onChange={setFilter}
          ariaLabel="Filter by status"
        />
        <ScrollableTabs
          items={CATEGORY_TABS}
          activeKey={categoryFilter}
          onChange={setCategoryFilter}
          ariaLabel="Filter by category"
        />
      </div>

      {/* Activity list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              No activities match your filters.
            </p>
          </div>
        )}
        {filtered
          .sort((a, b) => (a.scheduledDay || 0) - (b.scheduledDay || 0))
          .map((activity) => {
            const colors = categoryColors[activity.category] || categoryColors.learning;
            const isDone = activity.status === "completed";

            return (
              <div
                key={activity._id}
                className={`bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 border-l-4 ${colors.border} ${
                  isDone ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  {!isDone && activity.status === "upcoming" && (
                    <button
                      onClick={() => completeActivity({ id: activity._id })}
                      aria-label="Complete activity"
                      className="mt-0.5 sm:mt-0 w-5 h-5 rounded border-2 border-[#44403C] hover:border-[#D97757] transition-colors flex-shrink-0"
                    />
                  )}
                  {isDone && (
                    <div className="mt-0.5 sm:mt-0 w-5 h-5 rounded bg-[#D97757] flex items-center justify-center flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </div>
                  )}
                  {activity.status === "skipped" && (
                    <div className="mt-0.5 sm:mt-0 w-5 h-5 rounded bg-[#292524] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#A8A29E] text-xs">—</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-space-grotesk text-sm ${isDone ? "text-[#A8A29E] line-through" : "text-[#E7E5E4]"}`}>
                      {activity.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 sm:hidden">
                      <span className={`font-space-grotesk text-xs ${colors.text}`}>
                        {activity.category}
                      </span>
                      <span className="font-space-grotesk text-xs text-[#A8A29E]">
                        W{activity.weekNumber}
                      </span>
                      <span className="font-space-grotesk text-xs text-[#A8A29E]">
                        {activity.estimatedTime}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <span className={`font-space-grotesk text-xs ${colors.text}`}>
                      {activity.category}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#A8A29E]">
                      W{activity.weekNumber}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#A8A29E]">
                      {activity.estimatedTime}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Goals section */}
      {goals && goals.length > 0 && (
        <div>
          <h2 className="font-space-grotesk text-sm font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-4">
            Milestones & Goals
          </h2>
          <div className="space-y-2">
            {goals.map((goal) => (
              <div
                key={goal._id}
                className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 flex items-center gap-3"
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    goal.status === "completed"
                      ? "bg-green-500"
                      : goal.status === "in_progress"
                        ? "bg-[#D97757]"
                        : "bg-[#292524] border border-[#44403C]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-space-grotesk text-sm text-[#E7E5E4]">
                    {goal.title}
                  </p>
                </div>
                <span className="font-space-grotesk text-xs text-[#A8A29E]">
                  Phase {goal.targetPhase}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
