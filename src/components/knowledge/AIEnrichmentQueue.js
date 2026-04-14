"use client";

import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import { kbCard } from "@/lib/kbKnowledgeChrome";
import { cn } from "@/lib/utils";

const KIND_LABEL = {
  embed: "Embedding",
  enrich: "Extracting insights",
  memory_consolidate: "Consolidating memory",
  extract_text: "Extracting text",
};

export default function AIEnrichmentQueue() {
  const queue = useQuery(api.kb.enrichmentQueue);
  if (!queue || queue.length === 0) return null;

  return (
    <div className={cn(kbCard, "p-6")}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1F1510] rounded-md text-[#D97757]">
            <Icon icon="solar:magic-stick-3-linear" width={18} />
          </div>
          <h2 className="text-lg font-medium tracking-tight text-white">
            AI Enrichment
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {queue.map((j) => (
          <div
            key={j._id}
            className={`p-3 rounded-lg border ${
              j.status === "running"
                ? "border-[#D97757]/20 bg-[#1F1510]/40"
                : "border-[#44403C]/90 bg-[#1C1917]"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {j.status === "running" ? (
                <div className="w-4 h-4 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon
                  icon="solar:clock-circle-linear"
                  width={14}
                  className="text-[#A8A29E]"
                />
              )}
              <span
                className={`text-xs font-medium ${
                  j.status === "running" ? "text-[#D97757]" : "text-[#A8A29E]"
                }`}
              >
                {j.status === "running" ? "Processing…" : "Queued"}
              </span>
            </div>
            <p className="text-xs text-[#A8A29E] truncate">
              {KIND_LABEL[j.kind] || j.kind}: {j.documentTitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
