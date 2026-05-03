"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import { PageHeader, ScrollableTabs } from "@/components/primitives";
import NoPlanEmptyState from "@/components/app/NoPlanEmptyState";
import TaskProgressStrip from "@/components/app/TaskProgressStrip";
import TaskCard from "@/components/app/TaskCard";
import TaskDetailSheet from "@/components/app/TaskDetailSheet";
import PreBoardingBanner from "@/components/app/PreBoardingBanner";
import { useHasPlan } from "@/hooks/useHasPlan";
import { useToast } from "@/components/primitives/Toaster";
import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";
import { cn } from "@/lib/utils";

const STATUS_KEYS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "skipped", label: "Skipped" },
];

const GOAL_STATUS = {
  not_started: {
    label: "Not started",
    className: "bg-warm-surfaceDark text-warm-300",
  },
  in_progress: {
    label: "In progress",
    className: "bg-accent/15 text-accent",
  },
  completed: {
    label: "Done",
    className: "bg-green-500/15 text-green-300",
  },
};

function TasksSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      <div>
        <div className="h-3 w-16 bg-warm-cardDark rounded" />
        <div className="mt-3 h-10 bg-warm-cardDark rounded-lg w-2/3 sm:w-1/2" />
      </div>
      <div className="h-32 bg-warm-cardDark border border-warm-borderDark rounded-2xl" />
      <div className="flex gap-2">
        <div className="h-9 w-16 rounded-full bg-warm-cardDark" />
        <div className="h-9 w-24 rounded-full bg-warm-cardDark" />
        <div className="h-9 w-24 rounded-full bg-warm-cardDark" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-warm-cardDark border border-warm-borderDark border-l-4 border-l-warm-borderMuted rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border-2 border-warm-borderMuted shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-warm-surfaceDark rounded w-3/4" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 rounded-full bg-warm-surfaceDark" />
                  <div className="h-3 w-8 bg-warm-surfaceDark rounded" />
                  <div className="h-3 w-12 bg-warm-surfaceDark rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalCard({ goal }) {
  const status = GOAL_STATUS[goal.status] || GOAL_STATUS.not_started;
  return (
    <div className="bg-warm-cardDark border border-warm-borderDark rounded-xl p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="t-meta text-warm-300">
            Phase {goal.targetPhase}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              status.className
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="font-space-grotesk text-sm text-warm-line leading-snug">
          {goal.title}
        </p>
        {goal.targetMetric && (
          <p className="mt-1 font-space-grotesk text-xs text-warm-300">
            {goal.targetMetric}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const allActivities = useQuery(api.activities.getAll);
  const goals = useQuery(api.goals.list);
  const dayInfo = useQuery(api.users.getDayNumber);
  const viewer = useQuery(api.users.viewer);
  const { hasPlan, isGenerating } = useHasPlan();
  const completeActivity = useMutation(api.activities.complete);
  const skipActivity = useMutation(api.activities.skip);
  const rescheduleActivity = useMutation(api.activities.reschedule);
  const addToast = useToast();

  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    if (!allActivities)
      return { total: 0, completed: 0, upcoming: 0, skipped: 0 };
    return {
      total: allActivities.length,
      completed: allActivities.filter((a) => a.status === "completed").length,
      upcoming: allActivities.filter((a) => a.status === "upcoming").length,
      skipped: allActivities.filter((a) => a.status === "skipped").length,
    };
  }, [allActivities]);

  const statusCounts = useMemo(() => {
    if (!allActivities) return { all: 0, upcoming: 0, completed: 0, skipped: 0 };
    const baseByCategory =
      categoryFilter === "all"
        ? allActivities
        : allActivities.filter((a) => a.category === categoryFilter);
    return {
      all: baseByCategory.length,
      upcoming: baseByCategory.filter((a) => a.status === "upcoming").length,
      completed: baseByCategory.filter((a) => a.status === "completed").length,
      skipped: baseByCategory.filter((a) => a.status === "skipped").length,
    };
  }, [allActivities, categoryFilter]);

  const categoryCounts = useMemo(() => {
    if (!allActivities) return { all: 0 };
    const base =
      filter === "all"
        ? allActivities
        : allActivities.filter((a) => a.status === filter);
    const counts = { all: base.length };
    for (const cat of ACTIVITY_CATEGORIES) {
      counts[cat.slug] = base.filter((a) => a.category === cat.slug).length;
    }
    return counts;
  }, [allActivities, filter]);

  const todayCounts = useMemo(() => {
    if (!allActivities || !dayInfo?.dayNumber)
      return { todayDone: 0, todayTotal: 0 };
    const todays = allActivities.filter(
      (a) => a.scheduledDay === dayInfo.dayNumber
    );
    return {
      todayDone: todays.filter((a) => a.status === "completed").length,
      todayTotal: todays.length,
    };
  }, [allActivities, dayInfo]);

  if (!allActivities) {
    return <TasksSkeleton />;
  }

  if (allActivities.length === 0 && (isGenerating || !hasPlan)) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Plan"
          title="Tasks & Milestones"
          description="Your activity tracker."
          variant="display"
        />
        {isGenerating ? (
          <div className="bg-warm-cardDark border border-accent/30 rounded-xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="font-space-grotesk text-sm text-warm-300">
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

  // Filter the list according to current selections.
  let filtered = allActivities;
  if (filter !== "all") filtered = filtered.filter((a) => a.status === filter);
  if (categoryFilter !== "all")
    filtered = filtered.filter((a) => a.category === categoryFilter);

  // Group by week and sort.
  const grouped = filtered.reduce((acc, a) => {
    const wk = a.weekNumber ?? 0;
    (acc[wk] ??= []).push(a);
    return acc;
  }, {});
  const weekKeys = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);
  for (const wk of weekKeys) {
    grouped[wk].sort(
      (a, b) => (a.scheduledDay || 0) - (b.scheduledDay || 0)
    );
  }

  const selected = selectedId
    ? allActivities.find((a) => a._id === selectedId)
    : null;
  const preBoarding = dayInfo && !dayInfo.hasStarted;

  const statusTabs = STATUS_KEYS.map((s) => ({
    ...s,
    label: `${s.label} · ${statusCounts[s.key] ?? 0}`,
  }));

  const categoryTabs = [
    { key: "all", label: `All · ${categoryCounts.all ?? 0}` },
    ...ACTIVITY_CATEGORIES.map((c) => ({
      key: c.slug,
      label: `${c.label} · ${categoryCounts[c.slug] ?? 0}`,
      icon: <Icon icon={c.icon} className="w-3.5 h-3.5" />,
    })),
  ];

  function changeFilter(setter, value) {
    startTransition(() => setter(value));
  }

  function resetFilters() {
    startTransition(() => {
      setFilter("all");
      setCategoryFilter("all");
    });
  }

  async function handleComplete(activity, completionNotes) {
    try {
      await completeActivity({
        id: activity._id,
        completionNotes,
      });
      // Week completion check: was this the last incomplete in its week?
      const weekItems = allActivities.filter(
        (a) => a.weekNumber === activity.weekNumber
      );
      const remaining = weekItems.filter(
        (a) =>
          a._id !== activity._id &&
          a.status !== "completed" &&
          a.status !== "skipped"
      );
      if (remaining.length === 0 && weekItems.length > 1) {
        addToast(`Week ${activity.weekNumber} done.`, "success");
      } else {
        addToast("Activity completed.", "success");
      }
    } catch (err) {
      addToast(err.message || "Couldn't complete activity.", "error");
    }
  }

  async function handleSkip(activity) {
    try {
      await skipActivity({ id: activity._id });
      addToast("Activity skipped.", "info");
    } catch (err) {
      addToast(err.message || "Couldn't skip activity.", "error");
    }
  }

  async function handleReschedule(activity, newDate) {
    try {
      await rescheduleActivity({ id: activity._id, newDate });
      addToast("Activity rescheduled.", "success");
    } catch (err) {
      addToast(err.message || "Couldn't reschedule.", "error");
    }
  }

  return (
    <div className="pb-24 sm:pb-28 lg:pb-0">
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Plan"
          title="Tasks & Milestones"
          description={
            preBoarding
              ? "Your activity tracker."
              : `${stats.completed} of ${stats.total} completed.`
          }
          variant="display"
        />

        {preBoarding && <PreBoardingBanner startDate={dayInfo.startDate} />}

        <TaskProgressStrip
          completed={stats.completed}
          upcoming={stats.upcoming}
          skipped={stats.skipped}
          total={stats.total}
          todayDone={todayCounts.todayDone}
          todayTotal={todayCounts.todayTotal}
        />

        <div className="space-y-3">
          <ScrollableTabs
            items={statusTabs}
            activeKey={filter}
            onChange={(k) => changeFilter(setFilter, k)}
            ariaLabel="Filter by status"
          />
          <ScrollableTabs
            items={categoryTabs}
            activeKey={categoryFilter}
            onChange={(k) => changeFilter(setCategoryFilter, k)}
            ariaLabel="Filter by category"
          />
        </div>

        <div
          key={`${filter}-${categoryFilter}`}
          className={cn(
            "space-y-6 transition-opacity duration-150",
            isPending && "opacity-60"
          )}
        >
          {filtered.length === 0 ? (
            <div className="bg-warm-cardDark border border-warm-borderDark rounded-2xl p-10 text-center">
              <Icon
                icon="solar:filter-linear"
                className="w-10 h-10 text-warm-borderMuted mx-auto"
                aria-hidden
              />
              <p className="mt-4 font-instrument-serif text-xl text-warm-line">
                Nothing matches
              </p>
              <p className="mt-1 font-space-grotesk text-sm text-warm-300">
                Try clearing one of the filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-hover transition-colors min-h-11 font-space-grotesk text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Reset filters
              </button>
            </div>
          ) : (
            weekKeys.map((wk) => {
              const items = grouped[wk];
              const done = items.filter(
                (a) => a.status === "completed"
              ).length;
              return (
                <section key={wk} className="space-y-2">
                  <header className="sticky top-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 bg-paper-dark/80 backdrop-blur-sm flex items-center justify-between">
                    <h3 className="t-meta text-warm-300">Week {wk}</h3>
                    <span className="font-space-grotesk text-xs text-warm-300">
                      {done}/{items.length}
                    </span>
                  </header>
                  {items.map((activity, i) => (
                    <TaskCard
                      key={activity._id}
                      activity={activity}
                      index={i}
                      onComplete={handleComplete}
                      onSkip={handleSkip}
                      onReschedule={(a) => setSelectedId(a._id)}
                      onOpen={(a) => setSelectedId(a._id)}
                    />
                  ))}
                </section>
              );
            })
          )}
        </div>

        {goals && goals.length > 0 && (
          <section className="space-y-3 pt-2">
            <div>
              <p className="t-meta text-warm-300">Phase outcomes</p>
              <h2 className="t-h3 text-warm-line mt-1">Milestones &amp; Goals</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {goals.map((goal) => (
                <GoalCard key={goal._id} goal={goal} />
              ))}
            </div>
          </section>
        )}
      </div>

      <TaskDetailSheet
        activity={selected}
        open={!!selected}
        onClose={() => setSelectedId(null)}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onReschedule={handleReschedule}
      />
    </div>
  );
}
