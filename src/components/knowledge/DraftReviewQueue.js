"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";

const ANGLE_LABELS = {
  mission_values: "Mission & values",
  strategic_priorities: "Strategic priorities",
  leadership: "Leadership",
  products_recent: "Products",
  role_summary: "Your role",
  role_expectations: "Role expectations",
  stakeholders_implied: "Likely stakeholders",
  culture_signals: "Culture signals",
  industry_position: "Industry position",
  risks_open_questions: "Questions to ask",
};

function angleLabel(angle) {
  return ANGLE_LABELS[angle] || "Company context";
}

export default function DraftReviewQueue() {
  const drafts = useQuery(api.kb.pendingDrafts);
  const job = useQuery(api.companyResearchJobs.currentResearchJob);
  const approveDraft = useMutation(api.kb.approveDraft);
  const discardDraft = useMutation(api.kb.discardDraft);
  const requestResearch = useMutation(
    api.companyResearchJobs.requestCompanyResearch
  );

  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Cap the visible list at 5 by default. A long research run (8-12 drafts)
  // otherwise dominates the entire knowledge page and pushes everything else
  // below the fold. The user opts in to seeing the full backlog.
  const COLLAPSED_LIMIT = 5;

  // Nothing to show: no drafts and no job history. Keep the slot empty.
  if (drafts !== undefined && drafts.length === 0 && !job) {
    return null;
  }

  const isBuilding = job && (job.status === "queued" || job.status === "running");
  const hasFailed = job && job.status === "failed";
  const hasDrafts = drafts && drafts.length > 0;
  const finishedEmpty = job && job.status === "done" && drafts !== undefined && drafts.length === 0;

  async function handleApprove(id) {
    setBusyId(id);
    try {
      await approveDraft({ documentId: id });
    } catch (err) {
      console.error("approveDraft failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDiscard(id) {
    setBusyId(id);
    try {
      await discardDraft({ documentId: id });
    } catch (err) {
      console.error("discardDraft failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await requestResearch({ trigger: "manual" });
    } catch (err) {
      console.error("requestCompanyResearch failed:", err);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D97757]/20 bg-gradient-to-br from-[#1C1917] via-[#1C1917] to-[#1F1510] p-5 sm:p-6 shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97757]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[#1F1510] border border-[#D97757]/20 text-[#D97757] shrink-0">
              <Icon icon="solar:document-add-linear" width={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-medium tracking-tight text-white">
                Company research drafts
              </h2>
              <p className="text-xs text-[#A8A29E] mt-0.5">
                {isBuilding
                  ? "Researching your company in the background…"
                  : hasFailed
                  ? "Research didn't finish. You can try again."
                  : hasDrafts
                  ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} awaiting review. Verify the facts before approving — drafts aren't embedded into your brain until you do.`
                  : finishedEmpty
                  ? "Research finished but produced no usable drafts. You can run it again."
                  : "No drafts pending."}
              </p>
            </div>
          </div>
          {(hasFailed || finishedEmpty) && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="shrink-0 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border border-[#2C2825] bg-[#1C1917] text-sm text-[#A8A29E] hover:border-[#D97757]/30 hover:text-white transition-colors disabled:opacity-50"
            >
              <Icon icon="solar:refresh-linear" width={16} />
              {retrying ? "Starting…" : hasFailed ? "Retry research" : "Run again"}
            </button>
          )}
        </div>

        {isBuilding && !hasDrafts && (
          <div className="flex items-center gap-3 rounded-lg border border-[#2C2825] bg-[#1C1917]/60 px-4 py-4">
            <div className="w-4 h-4 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-[#A8A29E]">
              Building your company brain. This usually takes a few seconds.
            </p>
          </div>
        )}

        {hasFailed && !hasDrafts && (
          <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3">
            <p className="text-xs text-red-300">
              {job.error || "Research failed. Please retry."}
            </p>
          </div>
        )}

        {hasDrafts && (
          <ul className="space-y-3">
            {(showAll ? drafts : drafts.slice(0, COLLAPSED_LIMIT)).map((d) => {
              const expanded = expandedId === d._id;
              const isBusy = busyId === d._id;
              return (
                <li
                  key={d._id}
                  className="rounded-lg border border-[#2C2825] bg-[#1C1917]/70 hover:border-[#D97757]/30 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : d._id)
                    }
                    className="w-full text-left px-4 py-3 flex items-start gap-3"
                  >
                    <Icon
                      icon={
                        expanded
                          ? "solar:alt-arrow-down-linear"
                          : "solar:alt-arrow-right-linear"
                      }
                      width={14}
                      className="text-[#A8A29E] mt-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white truncate">
                          {d.title}
                        </p>
                        {d.angle && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1F1510] border border-[#D97757]/20 text-[#D97757]">
                            {angleLabel(d.angle)}
                          </span>
                        )}
                      </div>
                      {!expanded && (
                        <p className="text-xs text-[#A8A29E] mt-1 line-clamp-2">
                          {d.content}
                        </p>
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 pl-11">
                      <p className="text-xs text-[#D6D3D1] whitespace-pre-wrap leading-relaxed">
                        {d.content}
                      </p>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => handleApprove(d._id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Icon icon="solar:check-circle-linear" width={16} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscard(d._id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border border-[#2C2825] bg-[#1C1917] text-[#A8A29E] text-sm font-medium hover:border-[#44403C] hover:text-white transition-colors disabled:opacity-50"
                        >
                          <Icon icon="solar:close-circle-linear" width={16} />
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {hasDrafts && drafts.length > COLLAPSED_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border border-[#2C2825] bg-[#1C1917]/70 text-sm text-[#A8A29E] hover:border-[#D97757]/30 hover:text-white transition-colors"
          >
            <Icon
              icon={
                showAll
                  ? "solar:alt-arrow-up-linear"
                  : "solar:alt-arrow-down-linear"
              }
              width={16}
            />
            {showAll
              ? "Show fewer"
              : `Show all ${drafts.length} drafts`}
          </button>
        )}
      </div>
    </div>
  );
}
