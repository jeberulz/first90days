"use client";

import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import { SOURCE_TYPE_LABELS } from "@/lib/kbCategories";

const PROVIDER_ICONS = {
  manual: "solar:pen-new-square-linear",
  upload: "solar:upload-linear",
  reflection_autocapture: "solar:notebook-bookmark-linear",
  interaction_autocapture: "solar:users-group-rounded-linear",
  activity_completion_autocapture: "solar:checklist-minimalistic-linear",
  ai_generated: "solar:magic-stick-3-linear",
};

function relativeTime(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ConnectedSources() {
  const sources = useQuery(api.kb.sources);

  return (
    <div className="bg-[#1C1917] rounded-xl border border-[#2C2825] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#2C2825] rounded-md text-white">
            <Icon icon="solar:plug-circle-linear" width={18} />
          </div>
          <h2 className="text-lg font-medium tracking-tight text-white">
            Connected Sources
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {sources === undefined && (
          <div className="text-xs text-[#A8A29E]">Loading…</div>
        )}
        {sources &&
          sources
            .filter((s) => (s.syncedDocCount ?? 0) > 0)
            .map((s) => (
              <div
                key={s._id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#2C2825] hover:bg-[#2C2825]/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#2C2825] flex items-center justify-center shrink-0 text-[#A8A29E]">
                  <Icon
                    icon={PROVIDER_ICONS[s.provider] || "solar:database-linear"}
                    width={18}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">
                    {SOURCE_TYPE_LABELS[s.provider] || s.displayName}
                  </h3>
                  <p className="text-[10px] text-[#A8A29E]">
                    {s.syncedDocCount ?? 0} entries · {relativeTime(s.lastSyncAt)}
                  </p>
                </div>
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    s.status === "connected"
                      ? "bg-emerald-500"
                      : s.status === "error"
                      ? "bg-red-500"
                      : "bg-[#A8A29E]"
                  }`}
                />
              </div>
            ))}

        <div className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-[#2C2825] text-xs font-medium text-[#A8A29E]">
          <Icon icon="solar:add-circle-linear" width={16} />
          External connectors coming soon
        </div>
      </div>
    </div>
  );
}
