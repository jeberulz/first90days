"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Stakeholder cadence nudges shown on the Today page.
 *
 * Surfaces stakeholders whose relationship health has drifted (yellow),
 * gone cold (red), or — for Must-priority folks — hasn't been contacted
 * at all yet. Each row supports a one-click "Log check-in" that records a
 * minimal interaction (clearing the nudge), a 3-day snooze, and a jump
 * to the full stakeholder profile.
 *
 * Hidden entirely when the user has no stakeholders needing attention,
 * so pre-boarding + healthy users don't see empty state noise.
 */
export default function StakeholderNudges() {
  const nudges = useQuery(api.stakeholders.listNudges);
  const addInteraction = useMutation(api.stakeholders.addInteraction);
  const snoozeNudge = useMutation(api.stakeholders.snoozeNudge);
  const [pendingId, setPendingId] = useState(null);

  if (!nudges || nudges.length === 0) return null;

  async function handleLogCheckin(id) {
    setPendingId(id);
    try {
      const today = new Date().toISOString().split("T")[0];
      await addInteraction({
        stakeholderId: id,
        date: today,
        type: "check_in",
        notes: "Quick check-in logged from Today view.",
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleSnooze(id) {
    setPendingId(id);
    try {
      await snoozeNudge({ id, days: 3 });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-space-grotesk text-sm font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
            Relationship Nudges
          </h2>
          <p className="mt-1 font-space-grotesk text-xs text-[#78716C]">
            {nudges.length} {nudges.length === 1 ? "person" : "people"} need
            attention
          </p>
        </div>
        <Link
          href="/stakeholders"
          className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition"
        >
          View all →
        </Link>
      </div>

      <ul className="space-y-2">
        {nudges.map((n) => {
          const dotColor =
            n.health === "red"
              ? "bg-red-500"
              : n.health === "yellow"
                ? "bg-amber-500"
                : "bg-[#78716C]";
          const busy = pendingId === n._id;
          return (
            <li
              key={n._id}
              className="bg-[#0F0E0D] border border-[#2C2825] rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="font-space-grotesk text-sm font-medium text-[#E7E5E4] truncate">
                      {n.name}
                    </p>
                    <span className="font-space-grotesk text-xs text-[#78716C]">
                      {n.role}
                    </span>
                  </div>
                  <p className="mt-0.5 font-space-grotesk text-xs text-[#A8A29E]">
                    {n.reason}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleLogCheckin(n._id)}
                  className="font-space-grotesk text-xs px-2.5 py-1 rounded-md bg-[#D97757] hover:bg-[#C26242] text-white transition disabled:opacity-50"
                >
                  {busy ? "Logging…" : "Log check-in"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSnooze(n._id)}
                  className="font-space-grotesk text-xs px-2.5 py-1 rounded-md border border-[#44403C] text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#292524] transition disabled:opacity-50"
                >
                  Snooze 3d
                </button>
                <Link
                  href={`/stakeholders/${n._id}`}
                  className="font-space-grotesk text-xs px-2.5 py-1 rounded-md text-[#A8A29E] hover:text-[#E7E5E4] transition"
                >
                  Open profile
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
