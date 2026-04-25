"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { displayName, userInitials } from "@/lib/userDisplay";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="7" height="7" rx="1" />
        <rect x="10" y="1" width="7" height="7" rx="1" />
        <rect x="1" y="10" width="7" height="7" rx="1" />
        <rect x="10" y="10" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Today's View",
    href: "/today",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="8" />
        <path d="M9 4v5l3 3" />
      </svg>
    ),
  },
  {
    label: "Strategic Plan",
    href: "/plan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h14M2 7h10M2 11h12M2 15h8" />
      </svg>
    ),
  },
  {
    label: "Tasks & Milestones",
    href: "/tasks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9l3 3 7-7" />
        <rect x="1" y="1" width="16" height="16" rx="2" />
      </svg>
    ),
  },
  {
    label: "Progress",
    href: "/progress",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 15l4-6 4 3 6-8" />
        <path d="M2 17h14" />
      </svg>
    ),
  },
  {
    label: "Stakeholders",
    href: "/stakeholders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="5" r="3" />
        <path d="M1 15c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="14" cy="6" r="2" />
        <path d="M14 10c2.2 0 4 1.8 4 4" />
      </svg>
    ),
    badge: true,
  },
  {
    label: "Knowledge Base",
    href: "/knowledge",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 2h5l2 2h7v12H2V2z" />
      </svg>
    ),
    dot: true,
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const user = useQuery(api.users.viewer);
  const stakeholders = useQuery(api.stakeholders.list);
  const { signOut } = useAuthActions();

  // Display name + initials. Three states:
  //   user === undefined → query loading → "Loading…" + "?"
  //   user with display name → name + initials
  //   user without name → derive from email username so the pill never
  //                        looks stuck on "Loading…" for users who haven't
  //                        set a display name yet.
  const emailUser = user?.email ? user.email.split("@")[0] : "";
  const displayNameResolved = user
    ? displayName(user) || emailUser || "You"
    : "Loading…";
  const initials = user ? userInitials(user) : "?";

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0F0E0D] border-r border-[#2C2825]">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#2C2825]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center">
            <span className="text-white text-xs font-bold font-space-grotesk">A</span>
          </div>
          <span className="font-space-grotesk text-base font-medium tracking-[-0.4px] text-[#E7E5E4]">
            Arcora
          </span>
        </Link>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-b border-[#2C2825]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium font-space-grotesk">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-space-grotesk text-sm font-medium text-[#E7E5E4] truncate">
              {displayNameResolved}
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E] truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-3 font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
          Workspace
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg font-space-grotesk text-sm transition-colors",
                isActive
                  ? "bg-[#1C1917] border border-[#2C2825] text-white font-medium shadow-sm"
                  : "text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#1C1917]/50"
              )}
            >
              <span className={isActive ? "text-[#E7E5E4]" : "text-[#A8A29E]"}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && stakeholders && stakeholders.length > 0 && (
                <span className="bg-[#292524] text-[#A8A29E] text-xs font-medium px-2 py-0.5 rounded-full">
                  {stakeholders.length}
                </span>
              )}
              {item.dot && (
                <span className="w-2 h-2 rounded-full bg-[#D97757]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings + Sign out */}
      <div className="px-3 py-4 border-t border-[#2C2825] space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg font-space-grotesk text-sm transition-colors",
            pathname === "/settings"
              ? "bg-[#1C1917] border border-[#2C2825] text-white font-medium"
              : "text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#1C1917]/50"
          )}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="3" />
            <path d="M16 9a7 7 0 01-.4 2.3l1.4 1.1-1.4 2.4-1.7-.6a7 7 0 01-2 1.2L11.5 17h-3l-.4-1.6a7 7 0 01-2-1.2l-1.7.6-1.4-2.4 1.4-1.1A7 7 0 013 9a7 7 0 01.4-2.3l-1.4-1.1 1.4-2.4 1.7.6a7 7 0 012-1.2L7.5 1h3l.4 1.6a7 7 0 012 1.2l1.7-.6 1.4 2.4-1.4 1.1A7 7 0 0116 9z" />
          </svg>
          Settings
        </Link>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#1C1917]/50 transition-colors w-full text-left"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 15H3a1 1 0 01-1-1V4a1 1 0 011-1h3M12 12l4-3-4-3M16 9H7" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
