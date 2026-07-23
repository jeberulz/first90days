"use client";

import { useConvexAuth } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppSidebar from "@/components/app/AppSidebar";
import MobileBottomNav from "@/components/app/MobileBottomNav";
import QuickAddFAB from "@/components/app/QuickAddFAB";
import OnboardingNudgeBanner from "@/components/app/OnboardingNudgeBanner";
import PhaseCompletionModal from "@/components/milestones/PhaseCompletionModal";
import { ToastProvider } from "@/components/primitives/Toaster";
import FeedbackWidget, { FeedbackProvider } from "@/components/feedback/FeedbackWidget";

// Routes where the phase-completion modal is allowed to pop. Everywhere
// else (deep reflection flows, settings, knowledge editor, share/invite
// pages) is excluded so the celebration never crashes a focused task.
const MILESTONE_ALLOWED_PREFIXES = [
  "/dashboard",
  "/today",
  "/plan",
  "/progress",
];

function isMilestoneRoute(pathname) {
  if (!pathname) return false;
  return MILESTONE_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export default function AppLayout({ children }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  const user = useQuery(api.users.viewer);
  const plan = useQuery(api.plans.get);
  const reconcilePilotSchedule = useMutation(api.seed.reconcilePilotPlanSchedule);
  const pilotReconcileOnce = useRef(false);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);

  // Phase-completion celebration: the query returns the first
  // unacknowledged phase the user has already passed, or null.
  // `dismissedInSession` is a local cache so closing the modal hides
  // it immediately even before the mutation round-trips.
  const pendingMilestone = useQuery(
    api.milestones.getPendingMilestone,
    isAuthenticated ? {} : "skip"
  );
  const [dismissedMilestoneId, setDismissedMilestoneId] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Onboarding gate: send to /onboarding only if the user genuinely has
  // no plan yet. A user with an existing plan is effectively onboarded
  // even if `onboardingComplete` is stale (legacy accounts, interrupted
  // seed). Without the `plan === null` check, pilot users whose flag was
  // never backfilled got caught in a /dashboard ↔ /onboarding loop —
  // React then threw "Maximum update depth exceeded" and Next.js surfaced
  // it as a generic client-side exception on production.
  useEffect(() => {
    if (!user || plan === undefined) return;
    if (plan === null && !user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [user, plan, router]);

  useEffect(() => {
    if (!user || !user.isPilotUser) return;
    if (plan === undefined || plan === null) return;
    if (pilotReconcileOnce.current) return;

    let cancelled = false;
    (async () => {
      try {
        await reconcilePilotSchedule();
        if (!cancelled) pilotReconcileOnce.current = true;
      } catch (err) {
        console.error("[pilot-reconcile] failed", err);
        // leave ref false so a later re-render can retry
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, plan, reconcilePilotSchedule]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-paper-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const trialDaysLeft = user?.trialDaysLeft ?? 0;
  const showTrialBanner =
    !trialBannerDismissed &&
    user?.tier === "pro" &&
    trialDaysLeft > 0 &&
    trialDaysLeft <= 3;

  return (
    <ToastProvider>
    <FeedbackProvider>
    <div className="min-h-[100dvh] min-w-0 bg-paper-dark text-warm-line dark">
      {showTrialBanner && (
        <div
          role="status"
          className="w-full bg-[#D97757]/10 border-b border-[#D97757]/30 text-[#E7E5E4]"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 font-space-grotesk text-xs sm:text-sm">
            <span>
              {trialDaysLeft === 1
                ? "Your Pro trial ends tomorrow."
                : `${trialDaysLeft} days left in your Pro trial.`}{" "}
              <Link
                href="/settings?billing=trial"
                className="text-[#D97757] underline underline-offset-2 hover:text-[#F08B6A]"
              >
                Manage subscription
              </Link>
            </span>
            <button
              type="button"
              onClick={() => setTrialBannerDismissed(true)}
              className="text-[#A8A29E] hover:text-[#E7E5E4] px-2"
              aria-label="Dismiss trial reminder"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="flex min-w-0">
        <AppSidebar />
        <main className="flex-1 min-w-0 ml-0 lg:ml-64 min-h-[100dvh] pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <OnboardingNudgeBanner />
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
      <QuickAddFAB />
      <FeedbackWidget />
      {pendingMilestone &&
        pendingMilestone.phaseId !== dismissedMilestoneId &&
        isMilestoneRoute(pathname) && (
          <PhaseCompletionModal
            milestone={pendingMilestone}
            onClose={() => setDismissedMilestoneId(pendingMilestone.phaseId)}
          />
        )}
    </div>
    </FeedbackProvider>
    </ToastProvider>
  );
}
