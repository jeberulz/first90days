"use client";

import { useConvexAuth } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppSidebar from "@/components/app/AppSidebar";
import MobileBottomNav from "@/components/app/MobileBottomNav";
import QuickAddFAB from "@/components/app/QuickAddFAB";
import PhaseCompletionModal from "@/components/milestones/PhaseCompletionModal";

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

  useEffect(() => {
    if (user && !user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [user, router]);

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
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen min-w-0 bg-[#0F0E0D] text-[#E7E5E4] dark">
      <div className="flex min-w-0">
        <AppSidebar />
        <main className="flex-1 min-w-0 ml-0 lg:ml-64 min-h-screen pb-20 lg:pb-0">
          <div className="w-full min-w-0 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
      <QuickAddFAB />
      {pendingMilestone &&
        pendingMilestone.phaseId !== dismissedMilestoneId &&
        isMilestoneRoute(pathname) && (
          <PhaseCompletionModal
            milestone={pendingMilestone}
            onClose={() => setDismissedMilestoneId(pendingMilestone.phaseId)}
          />
        )}
    </div>
  );
}
