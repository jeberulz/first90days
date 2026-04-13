"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { use } from "react";
import Link from "next/link";

/**
 * Weekly review summary view. Renders the review the user submitted
 * plus an AI-generated summary that runs asynchronously after save.
 *
 * Status transitions (aiSummaryStatus):
 *   pending    → just queued, spinner
 *   generating → action running, spinner
 *   done       → summary is available
 *   failed     → show error + a note on retry
 */
export default function WeeklySummaryPage({ params }) {
  const { weekNumber } = use(params);
  const n = Number(weekNumber);
  const review = useQuery(
    api.reflections.getWeeklyReview,
    Number.isFinite(n) ? { weekNumber: n } : "skip"
  );

  if (review === undefined) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-2/3" />
        <div className="h-40 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        <div className="h-24 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (review === null) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
          Week {n} Summary
        </h1>
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center space-y-3">
          <p className="font-instrument-serif text-xl text-[#E7E5E4]">
            No review for this week yet
          </p>
          <p className="font-space-grotesk text-sm text-[#A8A29E]">
            Submit a weekly review first to see an AI-generated summary.
          </p>
          <Link
            href="/reflect/weekly"
            className="inline-block mt-2 bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition"
          >
            Start this week&apos;s review →
          </Link>
        </div>
      </div>
    );
  }

  const pct =
    review.activitiesPlanned > 0
      ? Math.round((review.activitiesCompleted / review.activitiesPlanned) * 100)
      : 0;

  const status = review.aiSummaryStatus || "pending";
  const summaryReady = status === "done" && review.aiSummary;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
            {review.date}
          </p>
          <h1 className="mt-1 font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
            Week {review.weekNumber} Summary
          </h1>
        </div>
        <Link
          href="/reflect/summaries"
          className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition flex-shrink-0 mt-2"
        >
          All summaries →
        </Link>
      </div>

      {/* AI summary card */}
      <div className="bg-gradient-to-br from-[#D97757]/10 to-[#1C1917] border border-[#D97757]/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#D97757"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M3 13l2-2M11 5l2-2" />
          </svg>
          <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#D97757]">
            AI-drafted summary
          </p>
        </div>

        {summaryReady ? (
          <p className="font-space-grotesk text-base text-[#E7E5E4] leading-relaxed whitespace-pre-wrap">
            {review.aiSummary}
          </p>
        ) : status === "failed" ? (
          <div className="space-y-2">
            <p className="font-space-grotesk text-sm text-red-400">
              Summary generation failed.
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E]">
              {review.aiSummaryError ||
                "The AI couldn't produce a summary right now."}{" "}
              Re-submitting your review will retry.
            </p>
            <Link
              href="/reflect/weekly"
              className="inline-block mt-1 font-space-grotesk text-xs text-[#D97757] hover:text-[#C26242] transition"
            >
              Re-submit review →
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              Drafting your week summary… usually 10-30 seconds.
            </p>
          </div>
        )}

        {summaryReady && review.aiSummaryGeneratedAt && (
          <p className="mt-4 font-space-grotesk text-[11px] text-[#78716C]">
            Generated{" "}
            {new Date(review.aiSummaryGeneratedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs text-[#A8A29E]">Rating</p>
          <p className="mt-1 font-instrument-serif text-2xl text-[#E7E5E4]">
            {review.rating}
            <span className="text-base text-[#A8A29E]"> / 5</span>
          </p>
        </div>
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs text-[#A8A29E]">
            Activities
          </p>
          <p className="mt-1 font-instrument-serif text-2xl text-[#E7E5E4]">
            {review.activitiesCompleted}
            <span className="text-base text-[#A8A29E]">
              {" "}
              / {review.activitiesPlanned}
            </span>
          </p>
        </div>
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs text-[#A8A29E]">
            Completion
          </p>
          <p className="mt-1 font-instrument-serif text-2xl text-[#D97757]">
            {pct}%
          </p>
        </div>
      </div>

      {/* User responses */}
      {review.questionResponses && review.questionResponses.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-space-grotesk text-sm font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
            Your Reflections
          </h3>
          {review.questionResponses
            .filter((r) => r.response && r.response.trim())
            .map((r, i) => (
              <div
                key={i}
                className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5"
              >
                <p className="font-space-grotesk text-xs text-[#A8A29E] mb-2">
                  {r.question}
                </p>
                <p className="font-space-grotesk text-sm text-[#E7E5E4] leading-relaxed whitespace-pre-wrap">
                  {r.response}
                </p>
              </div>
            ))}
        </div>
      )}

      {review.notes && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs text-[#A8A29E] mb-2">
            Additional notes
          </p>
          <p className="font-space-grotesk text-sm text-[#E7E5E4] leading-relaxed whitespace-pre-wrap">
            {review.notes}
          </p>
        </div>
      )}
    </div>
  );
}
