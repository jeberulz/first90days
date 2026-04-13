"use client";

import { Icon } from "@iconify/react";

const STATUS_META = {
  pending: { label: "Pending", className: "bg-[#2C2825] text-[#A8A29E]" },
  running: { label: "Processing", className: "bg-[#1F1510] text-[#D97757]" },
  done: { label: "Enriched", className: "bg-emerald-900/20 text-emerald-400" },
  failed: { label: "Failed", className: "bg-red-900/20 text-red-400" },
  skipped: { label: "Skipped", className: "bg-[#2C2825] text-[#A8A29E]" },
};

export default function DocumentSummaryCard({ doc }) {
  if (!doc) return null;

  const enrichmentBadge = STATUS_META[doc.enrichmentStatus] || STATUS_META.pending;
  const embedBadge = STATUS_META[doc.embeddingStatus] || STATUS_META.pending;

  return (
    <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1F1510] rounded-md text-[#D97757]">
            <Icon icon="solar:brain-linear" width={18} />
          </div>
          <h3 className="text-base font-medium text-white">AI summary</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`px-2 py-0.5 rounded-full ${embedBadge.className}`}>
            Embedding: {embedBadge.label}
          </span>
          <span className={`px-2 py-0.5 rounded-full ${enrichmentBadge.className}`}>
            Enrichment: {enrichmentBadge.label}
          </span>
        </div>
      </div>

      {doc.summary ? (
        <p className="text-sm text-[#E7E5E4] leading-relaxed">{doc.summary}</p>
      ) : (
        <p className="text-xs text-[#A8A29E] italic">
          No AI summary yet — the brain is still processing this entry, or the content is too short to enrich.
        </p>
      )}

      {doc.keyFacts && doc.keyFacts.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-[#A8A29E] mb-2">
            Key facts
          </h4>
          <ul className="space-y-1.5">
            {doc.keyFacts.map((f, i) => (
              <li key={i} className="text-sm text-[#E7E5E4] flex gap-2">
                <Icon
                  icon="solar:check-circle-linear"
                  width={16}
                  className="text-[#D97757] shrink-0 mt-0.5"
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {doc.entityLinks && doc.entityLinks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-[#A8A29E] mb-2">
            Linked to
          </h4>
          <div className="flex flex-wrap gap-2">
            {doc.entityLinks.map((l, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-[#2C2825] text-[#A8A29E] border border-[#44403C]"
              >
                {l.type}
              </span>
            ))}
          </div>
        </div>
      )}

      {doc.lastError && (
        <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded-md p-2">
          {doc.lastError}
        </div>
      )}
    </div>
  );
}
