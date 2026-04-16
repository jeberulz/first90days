"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/primitives/Toaster";
import { useHasPlan } from "@/hooks/useHasPlan";
import NoPlanEmptyState from "@/components/app/NoPlanEmptyState";

const energyEmojis = [
  { level: 1, emoji: "😴", label: "Drained" },
  { level: 2, emoji: "😐", label: "Low" },
  { level: 3, emoji: "🙂", label: "Okay" },
  { level: 4, emoji: "😊", label: "Good" },
  { level: 5, emoji: "🔥", label: "Energized" },
];

export default function DailyReflectionPage() {
  const router = useRouter();
  const { hasPlan, isGenerating, isLoading: planLoading } = useHasPlan();
  const viewer = useQuery(api.users.viewer);
  const today = new Date().toISOString().split("T")[0];
  const existing = useQuery(api.reflections.getDailyByDate, { date: today });
  const streak = useQuery(api.reflections.getStreak);
  const saveReflection = useMutation(api.reflections.saveDailyReflection);

  const [energy, setEnergy] = useState(existing?.energyLevel || 3);
  const [accomplishment, setAccomplishment] = useState(existing?.topAccomplishment || "");
  const [response, setResponse] = useState(existing?.reflectionResponse || "");
  const [blockers, setBlockers] = useState(existing?.blockers || "");
  const [tomorrowFocus, setTomorrowFocus] = useState(existing?.tomorrowFocus || "");
  const addToast = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasPlan) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        <div>
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Daily Check-in
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            Reflect on your day
          </p>
        </div>
        {isGenerating ? (
          <div className="bg-[#1C1917] border border-[#D97757]/30 rounded-xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              Your plan is being generated. Reflections will be available shortly.
            </p>
          </div>
        ) : (
          <NoPlanEmptyState
            heading="Reflections start with a plan"
            description="Daily check-ins help you track energy, wins, and blockers against your 90-day plan. Complete onboarding to start reflecting."
            lastOnboardingStep={viewer?.lastOnboardingStep}
            companyName={viewer?.partialOnboarding?.companyName}
          />
        )}
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveReflection({
        date: today,
        energyLevel: energy,
        topAccomplishment: accomplishment || undefined,
        reflectionPrompt: "How are you feeling about your progress today?",
        reflectionResponse: response,
        blockers: blockers || undefined,
        tomorrowFocus: tomorrowFocus || undefined,
      });
      addToast("Reflection saved", "success");
      setSaved(true);
      setTimeout(() => router.push("/today"), 1500);
    } catch (err) {
      addToast(err?.message ?? "Failed to save reflection", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
          Daily Check-in
        </h1>
        <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {streak !== undefined && streak > 0 && ` · ${streak} day streak`}
        </p>
      </div>

      {saved ? (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center space-y-3">
          <p className="text-4xl">✨</p>
          <p className="font-instrument-serif text-2xl text-[#E7E5E4]">
            Reflection saved!
          </p>
          <p className="font-space-grotesk text-sm text-[#A8A29E]">
            Redirecting to Today...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Energy level */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
            <label className="font-space-grotesk text-sm font-medium text-[#A8A29E] block mb-4">
              How&apos;s your energy today?
            </label>
            <div className="flex items-center justify-center gap-4">
              {energyEmojis.map((e) => (
                <button
                  key={e.level}
                  type="button"
                  onClick={() => setEnergy(e.level)}
                  aria-label={`Energy level: ${e.label} (${e.level})`}
                  aria-pressed={energy === e.level}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition ${
                    energy === e.level
                      ? "bg-[#D97757]/10 ring-2 ring-[#D97757]"
                      : "hover:bg-[#292524]"
                  }`}
                >
                  <span aria-hidden="true" className="text-2xl">{e.emoji}</span>
                  <span aria-hidden="true" className="font-space-grotesk text-xs text-[#A8A29E]">
                    {e.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Top accomplishment */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-2">
            <label className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
              Top accomplishment today
            </label>
            <input
              value={accomplishment}
              onChange={(e) => setAccomplishment(e.target.value)}
              className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
              placeholder="What are you most proud of today?"
            />
          </div>

          {/* Reflection */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-2">
            <label className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
              Reflection
            </label>
            <p className="font-instrument-serif text-lg text-[#E7E5E4] mb-2">
              How are you feeling about your progress today?
            </p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
              rows={4}
              placeholder="Write your thoughts..."
              required
            />
          </div>

          {/* Blockers */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-2">
            <label className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
              Any blockers?
            </label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
              rows={2}
              placeholder="Anything blocking your progress? (optional)"
            />
          </div>

          {/* Tomorrow */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-2">
            <label className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
              Tomorrow&apos;s focus
            </label>
            <input
              value={tomorrowFocus}
              onChange={(e) => setTomorrowFocus(e.target.value)}
              className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
              placeholder="What's the #1 priority for tomorrow?"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !response.trim()}
            className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-3 font-space-grotesk text-sm font-medium transition disabled:opacity-50 shadow-sm"
          >
            {saving ? "Saving..." : "Save reflection"}
          </button>
        </form>
      )}
    </div>
  );
}
