"use client";

import { useConvexAuth } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import AppSidebar from "@/components/app/AppSidebar";
import MobileBottomNav from "@/components/app/MobileBottomNav";
import QuickAddFAB from "@/components/app/QuickAddFAB";

export default function AppLayout({ children }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const user = useQuery(api.users.viewer);
  const plan = useQuery(api.plans.get);
  const reconcilePilotSchedule = useMutation(api.seed.reconcilePilotPlanSchedule);
  const pilotReconcileOnce = useRef(false);

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
    if (!user?.isPilotUser || plan === undefined || plan === null) return;
    if (pilotReconcileOnce.current) return;
    pilotReconcileOnce.current = true;
    reconcilePilotSchedule().catch(() => {
      pilotReconcileOnce.current = false;
    });
  }, [user?.isPilotUser, plan, reconcilePilotSchedule]);

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
    </div>
  );
}
