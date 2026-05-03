"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";

/**
 * Layout for the read-only "shared with me" workspace. Requires auth (so we
 * can scope queries to the viewing user) but — unlike the (app) layout — does
 * NOT force the viewer through onboarding. A manager who only ever views
 * other people's plans should never be bounced into the personal wizard.
 */
export default function SharedLayout({ children }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0F0E0D] text-[#E7E5E4] dark">
      <header className="border-b border-[#2C2825] bg-[#0F0E0D]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-[#E7E5E4]"
            aria-label="Arcora home"
          >
            <Logo className="h-9 w-auto" />
            <span className="font-space-grotesk text-xs uppercase tracking-[0.6px] text-[#A8A29E]">
              Shared workspace
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition"
            >
              My workspace
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
