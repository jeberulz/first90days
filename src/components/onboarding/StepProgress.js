"use client";

const TOTAL_STEPS = 6;
const STEP_TIMES = ["~1 min", "~1 min", "~1 min", "~1 min", "~2 min", "~1 min"];

export default function StepProgress({ currentStep }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors duration-400 ${
                isCompleted
                  ? "bg-accent"
                  : isCurrent
                    ? "bg-accent animate-pulse-glow"
                    : "bg-warm-line"
              }`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="font-space-grotesk text-xs text-warm-300">
          Step {currentStep + 1} of {TOTAL_STEPS}
        </span>
        <span className="font-space-grotesk text-xs text-warm-300">
          {STEP_TIMES[currentStep] || ""}
        </span>
      </div>
    </div>
  );
}
