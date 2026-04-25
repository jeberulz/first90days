"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

export default function OnboardingLayout({ children }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [saveVisible, setSaveVisible] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const saveOnboardingProgress = useMutation(api.users.saveOnboardingProgress);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    function onStorage() {
      setSaveVisible(true);
      const t = setTimeout(() => setSaveVisible(false), 2000);
      return () => clearTimeout(t);
    }
    window.addEventListener("storage", onStorage);
    const interval = setInterval(() => {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("onboarding_data")) {
        setSaveVisible(true);
        setTimeout(() => setSaveVisible(false), 2000);
      }
    }, 30000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-warm-ink">
      <header className="fixed top-0 inset-x-0 z-50 bg-paper/90 backdrop-blur-md border-b border-warm-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Icon icon="solar:stars-minimalistic-linear" className="text-accent" width={20} />
            <span className="font-space-grotesk text-sm font-medium tracking-tight">Arcora</span>
          </Link>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs text-warm-300 hidden sm:block transition-opacity duration-500 ${
                saveVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              Progress saved
            </span>
            <button
              type="button"
              onClick={() => setShowSkipConfirm(true)}
              className="text-xs text-warm-300 hover:text-warm-500 transition-colors font-space-grotesk"
            >
              Skip for now
            </button>
          </div>
        </div>
      </header>

      {showSkipConfirm && (
        <div className="fixed inset-0 z-[200] bg-warm-ink/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-fade-in-up">
            <h3 className="font-instrument-serif text-xl text-warm-ink mb-2">Skip onboarding?</h3>
            <p className="font-space-grotesk text-sm text-warm-500 mb-6">
              Your 90-day plan will be more generic without this context. You can always come back and complete it later.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-space-grotesk text-sm font-medium text-warm-500 border border-warm-line hover:bg-warm-line transition-colors"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const raw = typeof sessionStorage !== "undefined"
                      ? sessionStorage.getItem("onboarding_data")
                      : null;
                    if (raw) {
                      const parsed = JSON.parse(raw);
                      let step = 0;
                      if (parsed.roleType && parsed.function_) step = 1;
                      if (step >= 1 && parsed.companySize && parsed.companyStage && parsed.workModel && parsed.starsSituation) step = 2;
                      if (step >= 2 && parsed.selectedGoals) step = 3;
                      if (step >= 3 && parsed.successDefinition) step = 4;
                      if (step >= 4) step = 5;
                      const { stakeholders, scope, ...saveable } = parsed;
                      await saveOnboardingProgress({ step, data: saveable });
                    }
                  } catch {
                    // best-effort — don't block skip on save failure
                  }
                  await completeOnboarding();
                  router.push("/dashboard");
                }}
                className="flex-1 px-4 py-2.5 rounded-lg font-space-grotesk text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors"
              >
                Skip anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-14 pb-24">
        {children}
      </main>
    </div>
  );
}
