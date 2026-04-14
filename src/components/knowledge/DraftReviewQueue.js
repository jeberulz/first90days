"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";

export default function DraftReviewQueue() {
  const drafts = useQuery(api.kb.pendingDrafts);
  const job = useQuery(api.companyResearchJobs.currentResearchJob);
  const requestResearch = useMutation(
    api.companyResearchJobs.requestCompanyResearch
  );

  const [retrying, setRetrying] = useState(false);

  if (drafts !== undefined && drafts.length === 0 && !job) {
    return null;
  }

  const isBuilding = job && (job.status === "queued" || job.status === "running");
  const hasFailed = job && job.status === "failed";
  const hasDrafts = drafts && drafts.length > 0;
  const finishedEmpty =
    job && job.status === "done" && drafts !== undefined && drafts.length === 0;

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

  const showWorkspaceCta = hasDrafts || isBuilding;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D97757]/20 bg-gradient-to-br from-[#1C1917] via-[#1C1917] to-[#1F1510] p-5 sm:p-6 shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97757]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
                  ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} ready to review in the workspace. Nothing is embedded until you approve each section.`
                  : finishedEmpty
                  ? "Research finished but produced no usable drafts. You can run it again."
                  : "No drafts pending."}
              </p>
            </div>
          </div>
          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 shrink-0">
            {(hasFailed || finishedEmpty) && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#44403C]/90 bg-[#1C1917] text-xs text-[#A8A29E] hover:border-[#D97757]/25 hover:text-white transition-colors disabled:opacity-50"
              >
                <Icon icon="solar:refresh-linear" width={14} />
                {retrying ? "Starting…" : hasFailed ? "Retry research" : "Run again"}
              </button>
            )}
            {showWorkspaceCta && (
              <Link
                href="/knowledge/company-review"
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs sm:text-sm font-medium transition-colors shadow-sm text-center"
              >
                <Icon icon="solar:documents-linear" width={16} />
                Open review workspace
              </Link>
            )}
          </div>
        </div>

        {isBuilding && !hasDrafts && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#44403C]/90 bg-[#1C1917]/60 px-4 py-4">
            <div className="w-4 h-4 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-[#A8A29E]">
              Building your company brain. This usually takes a few seconds. You can
              open the workspace to watch sections appear.
            </p>
          </div>
        )}

        {hasFailed && !hasDrafts && (
          <div className="mt-4 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3">
            <p className="text-xs text-red-300">
              {job.error || "Research failed. Please retry."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
