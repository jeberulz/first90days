"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import StakeholderNudges from "@/components/stakeholders/StakeholderNudges";
import NoPlanEmptyState from "@/components/app/NoPlanEmptyState";
import { useHasPlan } from "@/hooks/useHasPlan";
import { useToast } from "@/components/primitives/Toaster";
import { useFeedback } from "@/components/feedback/FeedbackWidget";
import HelpWithThisButton from "@/components/whisperer/HelpWithThisButton";

const FIRST_ACTIVITY_PROMPTED_KEY = "feedback_first_activity_prompted";

const categoryColors = {
  learning: { bg: "bg-blue-500/10", border: "border-l-blue-500", text: "text-blue-400" },
  shipping: { bg: "bg-green-500/10", border: "border-l-green-500", text: "text-green-400" },
  relationships: { bg: "bg-amber-500/10", border: "border-l-amber-500", text: "text-amber-400" },
  influence: { bg: "bg-purple-500/10", border: "border-l-purple-500", text: "text-purple-400" },
};

function formatStartDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function TodayPage() {
  const dayInfo = useQuery(api.users.getDayNumber);
  const viewer = useQuery(api.users.viewer);
  const todayActivities = useQuery(api.activities.getToday);
  const streak = useQuery(api.reflections.getStreak);
  const completeActivity = useMutation(api.activities.complete);
  const skipActivity = useMutation(api.activities.skip);
  const rescheduleActivity = useMutation(api.activities.reschedule);

  const { isGenerating } = useHasPlan();
  const addToast = useToast();
  const feedback = useFeedback();
  const [completingId, setCompletingId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  if (dayInfo === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (dayInfo === null) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Today
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            Your daily view
          </p>
        </div>
        {isGenerating ? (
          <div className="bg-[#1C1917] border border-[#D97757]/30 rounded-xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              Your plan is being generated. Your daily activities will appear here shortly.
            </p>
          </div>
        ) : (
          <NoPlanEmptyState
            heading="Your day starts with a plan"
            description="The Today view shows your daily activities, progress, and streak. Complete onboarding to generate your personalised 90-day plan."
            lastOnboardingStep={viewer?.lastOnboardingStep}
            companyName={viewer?.partialOnboarding?.companyName}
          />
        )}
      </div>
    );
  }

  /* ── Pre-boarding state ── */
  if (!dayInfo.hasStarted) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="font-instrument-serif tracking-[-0.9px] text-3xl sm:text-4xl leading-tight">
            T-minus {dayInfo.daysUntilStart}
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            {formatStartDate(dayInfo.startDate)}
          </p>
        </div>

        <div className="bg-[#1C1917] bg-gradient-to-br from-[#1C1917] to-[#292524] border border-[#2C2825] rounded-xl p-6 sm:p-8 text-center">
          <p className="t-countdown text-[#D97757]">
            {dayInfo.daysUntilStart}
          </p>
          <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E]">
            {dayInfo.daysUntilStart === 1 ? "day" : "days"} until Day 1
          </p>
        </div>

        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-4">
          <h2 className="font-instrument-serif text-xl text-[#E7E5E4]">
            Your plan starts on {formatStartDate(dayInfo.startDate)}
          </h2>
          <p className="font-space-grotesk text-sm text-[#A8A29E]">
            Use this time to prepare. Activities will appear here once your plan begins.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex flex-col items-center gap-2 bg-[#292524]/50 rounded-lg p-4 hover:bg-[#292524] transition"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#D97757" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l7-4 7 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" />
                <path d="M8 16V10h4v6" />
              </svg>
              <span className="font-space-grotesk text-xs text-[#E7E5E4]">Pre-boarding checklist</span>
            </Link>
            <Link
              href="/stakeholders"
              className="flex flex-col items-center gap-2 bg-[#292524]/50 rounded-lg p-4 hover:bg-[#292524] transition"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#D97757" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="7" r="3" />
                <path d="M4 17v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
              </svg>
              <span className="font-space-grotesk text-xs text-[#E7E5E4]">Research stakeholders</span>
            </Link>
            <Link
              href="/knowledge"
              className="flex flex-col items-center gap-2 bg-[#292524]/50 rounded-lg p-4 hover:bg-[#292524] transition"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#D97757" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                <path d="M7 1v3M13 1v3M3 8h14" />
              </svg>
              <span className="font-space-grotesk text-xs text-[#E7E5E4]">Start knowledge base</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Active plan state ── */
  async function handleComplete(id) {
    if (completingId === id) {
      try {
        await completeActivity({ id, completionNotes: noteText || undefined });
        addToast("Activity marked complete", "success");

        // After the very first ever activity completion, prompt for feedback
        try {
          const alreadyPrompted = localStorage.getItem(FIRST_ACTIVITY_PROMPTED_KEY);
          if (!alreadyPrompted && feedback?.openModal) {
            localStorage.setItem(FIRST_ACTIVITY_PROMPTED_KEY, "1");
            addToast(
              "Enjoying First90?",
              "info",
              8000,
              { label: "Share feedback", onClick: () => feedback.openModal("prompt") }
            );
          }
        } catch {}
      } catch (err) {
        addToast(err?.message ?? "Failed to complete activity", "error");
      }
      setCompletingId(null);
      setNoteText("");
    } else {
      setCompletingId(id);
      setNoteText("");
    }
  }

  const completed = todayActivities?.filter((a) => a.status === "completed") || [];
  const upcoming = todayActivities?.filter((a) => a.status === "upcoming") || [];
  const total = todayActivities?.length || 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Day {dayInfo.dayNumber}: {getCurrentWeekTheme(dayInfo.weekNumber)}
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            Week {dayInfo.weekNumber} · {dayInfo.phaseName} Phase ·{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {streak !== undefined && streak > 0 && (
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl px-3 sm:px-4 py-3 text-center shrink-0">
            <p className="font-instrument-serif text-xl sm:text-2xl text-[#D97757]">
              {streak}
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E]">
              day streak
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-space-grotesk text-sm text-[#A8A29E]">
              Today&apos;s progress
            </span>
            <span className="font-space-grotesk text-sm font-medium text-[#E7E5E4]">
              {completed.length} / {total}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#292524] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D97757] rounded-full transition-all duration-500"
              style={{ width: `${(completed.length / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Stakeholder nudges */}
      <StakeholderNudges />

      {/* Activities */}
      <div className="space-y-3">
        {!todayActivities && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 bg-[#292524] rounded w-2/3 mb-2" />
                <div className="h-3 bg-[#292524] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {todayActivities && todayActivities.length === 0 && (
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
            <p className="font-instrument-serif text-xl text-[#E7E5E4]">
              No activities for today
            </p>
            <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E]">
              Check the plan view to see upcoming activities, or add one with
              Quick Add.
            </p>
          </div>
        )}

        {upcoming.map((activity) => {
          const colors = categoryColors[activity.category] || categoryColors.learning;
          return (
            <div
              key={activity._id}
              className={`bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 border-l-4 ${colors.border} transition-all`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleComplete(activity._id)}
                  aria-label={`Mark "${activity.title}" as complete`}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-[#44403C] hover:border-[#D97757] transition-colors flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-space-grotesk text-sm font-medium text-[#E7E5E4]">
                    {activity.title}
                  </p>
                  <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E] line-clamp-2">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`font-space-grotesk text-xs ${colors.text}`}>
                      {activity.category}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#A8A29E]">
                      {activity.estimatedTime}
                    </span>
                    <span
                      className={`font-space-grotesk text-xs ${
                        activity.priority === "High"
                          ? "text-[#D97757]"
                          : "text-[#A8A29E]"
                      }`}
                    >
                      {activity.priority}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setReschedulingId(activity._id);
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setRescheduleDate(tomorrow.toISOString().split("T")[0]);
                    }}
                    aria-label="Reschedule"
                    className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#292524] transition-colors"
                  >
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="2" width="12" height="11" rx="1" />
                      <path d="M4 1v2M10 1v2M1 5h12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => skipActivity({ id: activity._id })}
                    aria-label="Skip"
                    className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#292524] transition-colors"
                  >
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 2l6 5-6 5V2z" />
                      <line x1="11" y1="2" x2="11" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#2C2825]/60">
                <HelpWithThisButton
                  activityId={activity._id}
                  taskCategory={activity.category}
                  onMarkDone={() => handleComplete(activity._id)}
                />
              </div>
              {completingId === activity._id && (
                <div className="mt-3 pt-3 border-t border-[#2C2825]">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Quick note about how it went (optional)"
                    className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setCompletingId(null)}
                      className="px-3 py-1.5 rounded-md font-space-grotesk text-xs text-[#A8A29E] hover:bg-[#292524] transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleComplete(activity._id)}
                      className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-md px-3 py-1.5 font-space-grotesk text-xs font-medium transition"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              )}
              {reschedulingId === activity._id && (
                <div className="mt-3 pt-3 border-t border-[#2C2825]">
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                    />
                    <button
                      onClick={() => setReschedulingId(null)}
                      className="px-3 py-1.5 rounded-md font-space-grotesk text-xs text-[#A8A29E] hover:bg-[#292524] transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await rescheduleActivity({ id: activity._id, newDate: rescheduleDate });
                        setReschedulingId(null);
                      }}
                      className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-md px-3 py-1.5 font-space-grotesk text-xs font-medium transition"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {completed.map((activity) => {
          return (
            <div
              key={activity._id}
              className="bg-[#1C1917]/50 border border-[#2C2825]/50 rounded-xl p-4 border-l-4 border-l-[#2C2825] opacity-60"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 w-5 h-5 rounded bg-[#D97757] flex items-center justify-center flex-shrink-0"
                  role="img"
                  aria-label="Completed"
                >
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-space-grotesk text-sm text-[#A8A29E] line-through">
                    {activity.title}
                  </p>
                  {activity.completionNotes && (
                    <p className="mt-1 font-space-grotesk text-xs text-[#57534E] italic">
                      {activity.completionNotes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily reflection prompt */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-2">
          Daily Reflection
        </h3>
        <p className="font-instrument-serif text-lg text-[#E7E5E4]">
          How are you feeling about your progress today?
        </p>
        <a
          href="/reflect/daily"
          className="inline-block mt-3 font-space-grotesk text-sm text-[#D97757] hover:text-[#C26242] transition"
        >
          Start reflection →
        </a>
      </div>
    </div>
  );
}

function getCurrentWeekTheme(weekNumber) {
  const themes = {
    1: "Orientation & Setup",
    2: "Context & Architecture",
    3: "Stakeholder Deep Dives",
    4: "User & Market Understanding",
    5: "Quick Wins & First Contributions",
    6: "Research Framework",
    7: "Process Improvements",
    8: "Broadening Impact",
    9: "Strategic Initiatives",
    10: "Mentoring & Growth",
    11: "Roadmap Influence",
    12: "Reflection & Next Quarter",
  };
  return themes[weekNumber] || "Your Journey";
}
