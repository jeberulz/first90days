"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { ResponsiveModal } from "@/components/primitives";

const ROW_CLASS =
  "flex items-center gap-3 px-3 py-3 rounded-lg font-space-grotesk text-sm text-warm-300 hover:text-warm-line hover:bg-warm-cardDark/60 min-h-11 transition-colors w-full";

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" rx="1" />
      <rect x="10" y="1" width="7" height="7" rx="1" />
      <rect x="1" y="10" width="7" height="7" rx="1" />
      <rect x="10" y="10" width="7" height="7" rx="1" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="16" height="16" rx="2" />
      <path d="M4 9l3 3 7-7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <path d="M16 9a7 7 0 01-.4 2.3l1.4 1.1-1.4 2.4-1.7-.6a7 7 0 01-2 1.2L11.5 17h-3l-.4-1.6a7 7 0 01-2-1.2l-1.7.6-1.4-2.4 1.4-1.1A7 7 0 013 9a7 7 0 01.4-2.3l-1.4-1.1 1.4-2.4 1.7.6a7 7 0 012-1.2L7.5 1h3l.4 1.6a7 7 0 012 1.2l1.7-.6 1.4 2.4-1.4 1.1A7 7 0 0116 9z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 15H3a1 1 0 01-1-1V4a1 1 0 011-1h3M12 12l4-3-4-3M16 9H7" />
    </svg>
  );
}

export default function MoreMenuSheet({ open, onClose }) {
  const user = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();

  const emailUser = user?.email ? user.email.split("@")[0] : "";
  const displayName = user ? user.name || emailUser || "You" : "Loading…";
  const initials = (() => {
    if (!user) return "?";
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (emailUser[0] || "?").toUpperCase();
  })();

  async function handleSignOut() {
    onClose?.();
    try {
      await signOut();
    } catch (err) {
      console.error("[MoreMenuSheet] signOut failed", err);
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      placement="bottom-sheet"
      hideCloseButton
    >
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-warm-borderDark">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-medium font-space-grotesk">
            {initials}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-space-grotesk text-sm font-medium text-warm-line truncate">
            {displayName}
          </p>
          {user?.email && (
            <p className="font-space-grotesk text-xs text-warm-300 truncate">
              {user.email}
            </p>
          )}
        </div>
      </div>

      <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-warm-400 px-3 mb-2">
        Workspace
      </p>
      <nav className="space-y-1 mb-4">
        <Link href="/dashboard" onClick={onClose} className={ROW_CLASS}>
          <span className="text-warm-300"><DashboardIcon /></span>
          <span className="flex-1">Dashboard</span>
        </Link>
        <Link href="/tasks" onClick={onClose} className={ROW_CLASS}>
          <span className="text-warm-300"><TasksIcon /></span>
          <span className="flex-1">Tasks &amp; Milestones</span>
        </Link>
      </nav>

      <div className="pt-4 border-t border-warm-borderDark space-y-1">
        <Link href="/settings" onClick={onClose} className={ROW_CLASS}>
          <span className="text-warm-300"><SettingsIcon /></span>
          <span className="flex-1">Settings</span>
        </Link>
        <button type="button" onClick={handleSignOut} className={`${ROW_CLASS} text-left`}>
          <span className="text-warm-300"><SignOutIcon /></span>
          <span className="flex-1">Sign out</span>
        </button>
      </div>
    </ResponsiveModal>
  );
}
