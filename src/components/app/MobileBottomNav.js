"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import MoreMenuSheet from "@/components/app/MoreMenuSheet";

const tabs = [
  {
    label: "Today",
    href: "/today",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 5v5l3 3" />
      </svg>
    ),
  },
  {
    label: "Plan",
    href: "/plan",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4h14M3 8h10M3 12h12M3 16h8" />
      </svg>
    ),
  },
  {
    label: "People",
    href: "/stakeholders",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="6" r="3" />
        <path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="15" cy="7" r="2" />
        <path d="M15 11c2.2 0 4 1.8 4 4" />
      </svg>
    ),
  },
  {
    label: "Knowledge",
    href: "/knowledge",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h5l2 2h7v12H3V3z" />
      </svg>
    ),
  },
];

const moreIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="7" height="7" rx="1" />
    <rect x="11" y="2" width="7" height="7" rx="1" />
    <rect x="2" y="11" width="7" height="7" rx="1" />
    <rect x="11" y="11" width="7" height="7" rx="1" />
  </svg>
);

const MORE_PATHS = ["/dashboard", "/tasks", "/settings"];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive =
    moreOpen ||
    MORE_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-paper-dark border-t border-warm-borderDark z-[56] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 px-3 font-space-grotesk text-xs transition-colors min-h-11 min-w-11",
                  isActive ? "text-[#D97757]" : "text-[#A8A29E]"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 font-space-grotesk text-xs transition-colors min-h-11 min-w-11",
              moreActive ? "text-[#D97757]" : "text-[#A8A29E]"
            )}
          >
            {moreIcon}
            <span>More</span>
          </button>
        </div>
      </nav>
      <MoreMenuSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
