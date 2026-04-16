"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NoPlanEmptyState from "@/components/app/NoPlanEmptyState";

const defaultQuestions = [
  "What were your biggest accomplishments this week?",
  "What challenges did you face and how did you handle them?",
  "What did you learn about the team or product?",
  "How are your key relationships progressing?",
  "What's your top priority for next week?",
];

export default function WeeklyReviewPage() {
  const router = useRouter();
  const dayInfo = useQuery(api.users.getDayNumber);
  const viewer = useQuery(api.users.viewer);
  const activities = useQuery(api.activities.getByWeek, {
    weekNumber: dayInfo?.weekNumber || 1,
  });
  const saveReview = useMutation(api.reflections.saveWeeklyReview);

  const [rating, setRating] = useState(3);
  const [responses, setResponses] = useState(
    defaultQuestions.map((q) => ({ question: q, response: "" }))
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (dayInfo === undefined) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (dayInfo === null) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        <div>
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Weekly Review
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            Reflect on your week
          </p>
        </div>
        <NoPlanEmptyState
          heading="Weekly reviews need a plan"
          description="Review your weekly progress, rate your performance, and set priorities for the next week. Complete onboarding to start your 90-day plan."
          lastOnboardingStep={viewer?.lastOnboardingStep}
          companyName={viewer?.partialOnboarding?.companyName}
        />
      </div>
    );
  }

  if (!activities) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const completed = activities.filter((a) => a.status === "completed").length;
  const planned = activities.length;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveReview({
        weekNumber: dayInfo.weekNumber,
        date: new Date().toISOString().split("T")[0],
        rating,
        questionResponses: responses,
        activitiesCompleted: completed,
        activitiesPlanned: planned,
        notes: notes || undefined,
      });
      router.push(`/reflect/summary/${dayInfo.weekNumber}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Week {dayInfo.weekNumber} Review
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            {dayInfo.phaseName} Phase
          </p>
        </div>
        <Link
          href="/reflect/summaries"
          className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition flex-shrink-0 mt-2"
        >
          Past summaries →
        </Link>
      </div>

      {/* Auto stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs text-[#A8A29E]">Activities</p>
          <p className="font-instrument-serif text-2xl text-[#E7E5E4]">
            {completed} <span className="text-base text-[#A8A29E]">/ {planned}</span>
          </p>
        </div>
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs text-[#A8A29E]">Completion</p>
          <p className="font-instrument-serif text-2xl text-[#D97757]">
            {planned > 0 ? Math.round((completed / planned) * 100) : 0}%
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Week rating */}
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
          <label className="font-space-grotesk text-sm font-medium text-[#A8A29E] block mb-4">
            How would you rate this week?
          </label>
          <div className="flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`w-12 h-12 rounded-xl font-instrument-serif text-xl transition ${
                  rating >= n
                    ? "bg-[#D97757] text-white"
                    : "bg-[#292524] text-[#A8A29E] hover:bg-[#44403C]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Questions */}
        {responses.map((r, i) => (
          <div key={i} className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-2">
            <label className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
              {r.question}
            </label>
            <textarea
              value={r.response}
              onChange={(e) => {
                const updated = [...responses];
                updated[i] = { ...updated[i], response: e.target.value };
                setResponses(updated);
              }}
              className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
              rows={3}
              placeholder="Your thoughts..."
            />
          </div>
        ))}

        {/* Additional notes */}
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-2">
          <label className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
            Anything else?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
            rows={2}
            placeholder="Additional thoughts or notes... (optional)"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-3 font-space-grotesk text-sm font-medium transition disabled:opacity-50 shadow-sm"
        >
          {saving ? "Saving…" : "Save & generate summary"}
        </button>
        <p className="text-center font-space-grotesk text-xs text-[#78716C]">
          We&apos;ll draft an AI summary grounded in your completed activities
          and knowledge base.
        </p>
      </form>
    </div>
  );
}
