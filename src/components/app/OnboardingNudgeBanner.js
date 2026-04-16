"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

const TOTAL_STEPS = 6;

export default function OnboardingNudgeBanner() {
  const viewer = useQuery(api.users.viewer);
  const plan = useQuery(api.plans.get);
  const [dismissed, setDismissed] = useState(false);

  // Only show when user skipped onboarding (has no plan) and has partial data
  if (dismissed) return null;
  if (!viewer || plan === undefined) return null;
  if (plan !== null) return null;
  if (!viewer.onboardingComplete) return null;

  const lastStep = viewer.lastOnboardingStep;
  // Don't show if they never got past step 0 and have no data
  if (lastStep == null && !viewer.partialOnboarding) return null;

  const stepsCompleted = lastStep != null ? lastStep + 1 : 0;
  const stepsRemaining = TOTAL_STEPS - stepsCompleted;
  const resumeStep = lastStep != null
    ? Math.min(lastStep + 2, TOTAL_STEPS)
    : 1;

  let message;
  if (stepsCompleted === 0) {
    message = "Complete onboarding to generate your 90-day plan";
  } else if (stepsCompleted >= 5) {
    message = "Your data is ready \u2014 just hit Generate!";
  } else if (stepsRemaining <= 2) {
    message = `Almost there \u2014 just ${stepsRemaining} more ${stepsRemaining === 1 ? "step" : "steps"}`;
  } else {
    message = `You're ${stepsRemaining} steps from your plan`;
  }

  return (
    <div className="mb-6 bg-[#1C1917] border border-[#2C2825] rounded-xl px-4 py-3 flex items-center gap-3">
      {/* Progress dots */}
      <div className="flex items-center gap-1 shrink-0" aria-label={`${stepsCompleted} of ${TOTAL_STEPS} steps completed`}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < stepsCompleted ? "bg-[#D97757]" : "bg-[#44403C]"
            }`}
          />
        ))}
      </div>

      <p className="flex-1 font-space-grotesk text-sm text-[#A8A29E] min-w-0 truncate">
        {message}
      </p>

      <Link
        href={`/onboarding/${resumeStep}`}
        className="shrink-0 font-space-grotesk text-sm font-medium text-[#D97757] hover:text-[#F08B6A] transition-colors"
      >
        Resume setup &rarr;
      </Link>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-[#A8A29E] hover:text-[#E7E5E4] px-1 transition-colors"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
