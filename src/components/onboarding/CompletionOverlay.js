"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

export default function CompletionOverlay({ error, onRetry, onDashboard }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (error) return;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 12 + 4;
        if (next >= 100) {
          clearInterval(intervalRef.current);
          setTimeout(() => setReady(true), 600);
          return 100;
        }
        return next;
      });
    }, 500);

    return () => clearInterval(intervalRef.current);
  }, [error]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] bg-paper flex items-center justify-center p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-red-100 flex items-center justify-center animate-fade-in-up">
            <Icon icon="solar:danger-triangle-linear" className="text-red-500" width={36} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-4 animate-fade-in-up">
            Something went wrong
          </h1>
          <p className="text-sm text-warm-500 mb-8 animate-fade-in-up">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="bg-accent hover:bg-accent-hover text-white rounded-xl px-8 py-3 font-space-grotesk text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-sm animate-fade-in-up"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-paper flex items-center justify-center p-6 animate-fade-in-up">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg animate-fade-in-up">
          <Icon icon="solar:stars-minimalistic-linear" className="text-white" width={36} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-4 onboarding-fade-in-d1">
          You&apos;re all set!
        </h1>
        <p className="text-base text-warm-500 leading-relaxed mb-3 onboarding-fade-in-d2">
          We&apos;re generating your personalized 90-day plan based on everything you shared.
        </p>
        <p className="text-sm text-warm-300 mb-10 onboarding-fade-in-d3">
          This includes your strategic milestones, stakeholder outreach schedule, and suggested tasks for week one.
        </p>

        <div className="onboarding-fade-in-d4">
          {!ready ? (
            <div className="mb-8">
              <div className="flex items-center justify-center gap-3 text-sm text-warm-500 mb-4">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Generating your plan...</span>
              </div>
              <div className="w-full bg-warm-line rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDashboard}
              className="bg-accent hover:bg-accent-hover text-white rounded-xl px-8 py-3 font-space-grotesk text-sm font-medium inline-flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
            >
              Go to your dashboard
              <Icon icon="solar:arrow-right-linear" width={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
