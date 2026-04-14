"use client";

import { Icon } from "@iconify/react";
import { kbCard } from "@/lib/kbKnowledgeChrome";
import { cn } from "@/lib/utils";

// Combined "ready / processing / failed" state for the summary card. The
// internal pipeline has two stages (embed + enrich) but the user only needs
// one rolled-up status: is this entry working for me yet?
function summaryStatus(doc) {
  if (doc.embeddingStatus === "failed" || doc.enrichmentStatus === "failed") {
    return {
      label: "Couldn't process",
      className: "bg-red-900/20 text-red-400",
    };
  }
  if (
    doc.embeddingStatus === "done" &&
    (doc.enrichmentStatus === "done" || doc.enrichmentStatus === "skipped")
  ) {
    return {
      label: "Ready",
      className: "bg-emerald-900/20 text-emerald-400",
    };
  }
  return {
    label: "Processing…",
    className: "bg-[#1F1510] text-[#D97757]",
  };
}

export default function DocumentSummaryCard({ doc }) {
  if (!doc) return null;

  const status = summaryStatus(doc);

  return (
    <div className={cn(kbCard, "p-6 space-y-5")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1F1510] rounded-md text-[#D97757]">
            <Icon icon="solar:notes-minimalistic-linear" width={18} />
          </div>
          <h3 className="text-base font-medium text-white">Summary</h3>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.className}`}>
          {status.label}
        </span>
      </div>

      {doc.summary ? (
        <p className="text-sm text-[#E7E5E4] leading-relaxed">{doc.summary}</p>
      ) : (
        <p className="text-xs text-[#A8A29E] italic">
          No summary yet — still processing, or the content is too short to extract from.
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
                className="text-xs px-2 py-0.5 rounded-full bg-[#1C1917] text-[#A8A29E] border border-[#44403C]/80"
              >
                {l.type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Only show errors when a pipeline stage actually failed. A leftover
          lastError from a prior best-effort step (e.g. memory consolidation)
          shouldn't surface here when enrichment + embedding succeeded. */}
      {doc.lastError &&
        (doc.embeddingStatus === "failed" || doc.enrichmentStatus === "failed") && (
          <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded-md p-2">
            {doc.lastError}
          </div>
        )}
    </div>
  );
}
