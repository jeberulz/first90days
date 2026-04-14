"use client";

import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";

const TOTAL_CATEGORIES = 6;

export default function AIBrainStatusCard() {
  const status = useQuery(api.kb.brainStatus);
  const categoryStats = useQuery(api.kb.categoryStats);

  if (status === undefined || categoryStats === undefined) {
    return (
      <div className="rounded-xl border border-[#44403C]/90 bg-[#1C1917] p-6 animate-pulse h-32" />
    );
  }

  const categoriesFilled = categoryStats.filter((c) => c.count > 0).length;
  const isWorking = status.runningJobs > 0 || status.queuedJobs > 0;
  const queuedSub =
    status.queuedJobs > 0
      ? `${status.queuedJobs} processing`
      : "Up to date";

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D97757]/20 bg-gradient-to-br from-[#1C1917] via-[#1C1917] to-[#1F1510] p-6 shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97757]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#D97757]/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D97757]/30 to-[#D97757]/10 flex items-center justify-center relative border border-[#D97757]/20">
            <Icon
              icon="solar:notes-minimalistic-linear"
              width={36}
              className="text-[#D97757]"
            />
            {isWorking && (
              <div className="absolute inset-0 rounded-2xl border-2 border-[#D97757]/30 animate-ping" />
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <Stat
            value={status.documentCount}
            label="Entries"
            sub={queuedSub}
          />
          <Stat
            value={`${categoriesFilled}`}
            valueSuffix={` / ${TOTAL_CATEGORIES}`}
            label="Categories with content"
            sub={
              categoriesFilled === TOTAL_CATEGORIES
                ? "All covered"
                : `${TOTAL_CATEGORIES - categoriesFilled} still empty`
            }
          />
        </div>

        {isWorking && (
          <div className="shrink-0 hidden xl:block">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-emerald-900/20 border-emerald-800/50 text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Processing
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, valueSuffix, label, sub }) {
  return (
    <div>
      <div className="text-2xl font-medium tracking-tight text-white">
        {value}
        {valueSuffix && (
          <span className="text-base text-[#A8A29E]">{valueSuffix}</span>
        )}
      </div>
      <div className="text-xs text-[#A8A29E] mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-[#A8A29E] mt-1">{sub}</div>}
    </div>
  );
}
