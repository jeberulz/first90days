"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";

/**
 * History of all weekly reviews with their AI-drafted summaries.
 * Newest week first. Each row links to the full detail page.
 */
export default function WeeklySummariesPage() {
  const reviews = useQuery(api.reflections.listWeeklyReviews);

  if (reviews === undefined) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
            Weekly Summaries
          </h1>
          <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
            {reviews.length === 0
              ? "Your weekly summaries will appear here."
              : `${reviews.length} ${reviews.length === 1 ? "week" : "weeks"} logged`}
          </p>
        </div>
        <Link
          href="/reflect/weekly"
          className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition flex-shrink-0"
        >
          New review
        </Link>
      </div>

      {reviews.length === 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center space-y-3">
          <p className="font-instrument-serif text-xl text-[#E7E5E4]">
            No weekly reviews yet
          </p>
          <p className="font-space-grotesk text-sm text-[#A8A29E]">
            Submit a weekly review and we&apos;ll draft an AI summary grounded
            in your completed activities and knowledge base.
          </p>
        </div>
      )}

      {reviews.map((r) => {
        const pct =
          r.activitiesPlanned > 0
            ? Math.round((r.activitiesCompleted / r.activitiesPlanned) * 100)
            : 0;
        const status = r.aiSummaryStatus || "pending";

        return (
          <Link
            key={r._id}
            href={`/reflect/summary/${r.weekNumber}`}
            className="block bg-[#1C1917] border border-[#2C2825] rounded-xl p-5 hover:border-[#44403C] transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-instrument-serif text-xl text-[#E7E5E4]">
                    Week {r.weekNumber}
                  </h3>
                  <span className="font-space-grotesk text-xs text-[#78716C]">
                    {r.date}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 flex-wrap">
                  <span className="font-space-grotesk text-xs text-[#A8A29E]">
                    {r.rating}/5 rating
                  </span>
                  <span className="font-space-grotesk text-xs text-[#A8A29E]">
                    · {r.activitiesCompleted}/{r.activitiesPlanned} activities
                  </span>
                  <span className="font-space-grotesk text-xs text-[#D97757]">
                    · {pct}%
                  </span>
                </div>
              </div>
              <SummaryBadge status={status} />
            </div>

            {status === "done" && r.aiSummary && (
              <p className="mt-3 font-space-grotesk text-sm text-[#E7E5E4] leading-relaxed line-clamp-3">
                {r.aiSummary}
              </p>
            )}
            {status !== "done" && status !== "failed" && (
              <p className="mt-3 font-space-grotesk text-xs text-[#A8A29E] italic">
                Drafting summary…
              </p>
            )}
            {status === "failed" && (
              <p className="mt-3 font-space-grotesk text-xs text-red-400">
                Summary generation failed — re-submit the review to retry.
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function SummaryBadge({ status }) {
  if (status === "done") {
    return (
      <span className="flex-shrink-0 font-space-grotesk text-[10px] font-medium uppercase tracking-[0.6px] text-[#4ADE80] bg-[#4ADE80]/10 border border-[#4ADE80]/30 rounded-full px-2 py-0.5">
        Summary ready
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex-shrink-0 font-space-grotesk text-[10px] font-medium uppercase tracking-[0.6px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-full px-2 py-0.5">
        Failed
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 font-space-grotesk text-[10px] font-medium uppercase tracking-[0.6px] text-[#D97757] bg-[#D97757]/10 border border-[#D97757]/30 rounded-full px-2 py-0.5 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-pulse" />
      Drafting
    </span>
  );
}
