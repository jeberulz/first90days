"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import { kbDraftAngleLabel } from "@/lib/kbDraftAngles";
import { kbToolbarBtn } from "@/lib/kbKnowledgeChrome";
import { cn } from "@/lib/utils";

const EMPTY_DRAFT_LIST = [];

export default function CompanyReviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get("draft");

  const drafts = useQuery(api.kb.pendingDrafts);
  const job = useQuery(api.companyResearchJobs.currentResearchJob);
  const approveDraft = useMutation(api.kb.approveDraft);
  const discardDraft = useMutation(api.kb.discardDraft);
  const requestResearch = useMutation(
    api.companyResearchJobs.requestCompanyResearch
  );

  const [selectedId, setSelectedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const list = drafts === undefined ? EMPTY_DRAFT_LIST : drafts;
  const isBuilding = job && (job.status === "queued" || job.status === "running");
  const hasFailed = job && job.status === "failed";
  const hasDrafts = list.length > 0;
  const finishedEmpty =
    job && job.status === "done" && drafts !== undefined && list.length === 0;

  useEffect(() => {
    if (list.length === 0) {
      setSelectedId(null);
      return;
    }
    if (draftParam && list.some((d) => d._id === draftParam)) {
      setSelectedId(draftParam);
      return;
    }
    if (draftParam) {
      router.replace("/knowledge/company-review", { scroll: false });
    }
    setSelectedId((prev) => {
      if (prev && list.some((d) => d._id === prev)) return prev;
      return list[0]._id;
    });
  }, [draftParam, list, router]);

  const selectDraft = useCallback(
    (id) => {
      setSelectedId(id);
      const next = new URLSearchParams(searchParams.toString());
      next.set("draft", id);
      router.replace(`/knowledge/company-review?${next.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const selected = list.find((d) => d._id === selectedId) ?? null;

  async function handleApprove(id) {
    setBusyId(id);
    try {
      await approveDraft({ documentId: id });
      setSelectedId(null);
      router.replace("/knowledge/company-review", { scroll: false });
    } catch (err) {
      console.error("approveDraft failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDiscardDraft(id) {
    setBusyId(id);
    try {
      await discardDraft({ documentId: id });
      setSelectedId(null);
      router.replace("/knowledge/company-review", { scroll: false });
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

  if (drafts === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#1C1917] rounded-lg animate-pulse w-1/3 max-w-xs" />
        <div className="h-[min(560px,70vh)] bg-[#1C1917] border border-[#44403C]/90 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-2 text-xs text-[#A8A29E] hover:text-[#D97757] transition-colors w-fit"
        >
          <Icon icon="solar:arrow-left-linear" width={16} />
          Back to Knowledge Base
        </Link>
        {(hasFailed || finishedEmpty) && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className={cn(
              kbToolbarBtn,
              "shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 text-xs w-fit disabled:opacity-50"
            )}
          >
            <Icon icon="solar:refresh-linear" width={14} />
            {retrying ? "Starting…" : hasFailed ? "Retry research" : "Run again"}
          </button>
        )}
      </div>

      <div>
        <h1 className="font-instrument-serif tracking-[-0.5px] text-2xl sm:text-3xl text-white">
          Company context review
        </h1>
        <p className="font-space-grotesk text-xs sm:text-sm text-[#A8A29E] mt-1 max-w-2xl">
          Read each research section, then approve or discard. Nothing is embedded
          into your brain until you approve.
        </p>
      </div>

      {isBuilding && !hasDrafts && (
        <div className="flex items-center gap-3 rounded-xl border border-[#44403C]/90 bg-[#1C1917]/60 px-4 py-5">
          <div className="w-4 h-4 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm text-[#A8A29E]">
            Building your company context. Sections will appear here as they are
            ready.
          </p>
        </div>
      )}

      {hasFailed && !hasDrafts && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-4">
          <p className="text-sm text-red-300">
            {job.error || "Research failed. Use retry above or return to Knowledge Base."}
          </p>
        </div>
      )}

      {!hasDrafts && !isBuilding && !hasFailed && (
        <div className="rounded-xl border border-[#44403C]/90 bg-[#1C1917]/40 px-6 py-12 text-center">
          <Icon
            icon="solar:check-circle-linear"
            width={40}
            className="mx-auto text-[#57534E] mb-3"
          />
          <p className="text-sm text-[#D6D3D1] font-medium">Nothing to review</p>
          <p className="text-xs text-[#A8A29E] mt-1 max-w-md mx-auto">
            {finishedEmpty
              ? "Research finished without drafts you can review. You can run research again from Knowledge Base."
              : "You are caught up. When new company research drafts arrive, open this workspace from the Knowledge Base page."}
          </p>
          <Link
            href="/knowledge"
            className="inline-flex mt-6 items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          >
            Back to Knowledge Base
          </Link>
        </div>
      )}

      {hasDrafts && (
        <div
          className="flex flex-col lg:flex-row rounded-xl border border-[#D97757]/20 bg-gradient-to-br from-[#1C1917] via-[#1C1917] to-[#1F1510] overflow-hidden shadow-sm h-[min(72dvh,calc(100dvh-8rem))] min-h-[280px]"
        >
          <aside className="lg:w-[min(100%,280px)] shrink-0 border-b lg:border-b-0 lg:border-r border-[#44403C]/55 bg-[#1C1917]/90 flex flex-col min-h-0 max-h-[min(220px,36dvh)] lg:max-h-none lg:h-full">
            <div className="px-4 py-3 border-b border-[#44403C]/55 shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-[#78716C]">
                Sections
              </p>
              <p className="text-sm font-medium text-white mt-0.5">
                {list.length} to review
              </p>
            </div>
            <ul className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1">
              {list.map((d) => {
                const active = d._id === selectedId;
                return (
                  <li key={d._id}>
                    <button
                      type="button"
                      onClick={() => selectDraft(d._id)}
                      aria-current={active ? "page" : undefined}
                      className={`w-full text-left rounded-lg min-h-11 px-3 py-2 transition-colors ${
                        active
                          ? "bg-[#1F1510] border border-[#D97757]/35 text-white"
                          : "border border-transparent text-[#D6D3D1] hover:bg-[#1C1917] hover:border-[#44403C]/55"
                      }`}
                    >
                      <p className="text-xs font-medium truncate">{d.title}</p>
                      {d.angle && (
                        <p className="text-[10px] text-[#D97757] mt-0.5 truncate">
                          {kbDraftAngleLabel(d.angle)}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden lg:min-h-0">
            {selected ? (
              <>
                <div className="shrink-0 z-10 border-b border-[#44403C]/55 bg-[#1C1917]/98 px-4 sm:px-6 py-4">
                  <div className="max-w-prose">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                        {selected.title}
                      </h2>
                      {selected.angle && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-[#1F1510] border border-[#D97757]/25 text-[#D97757] shrink-0">
                          {kbDraftAngleLabel(selected.angle)}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(selected._id)}
                        disabled={busyId === selected._id}
                        className="inline-flex items-center gap-2 min-h-11 px-5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Icon icon="solar:check-circle-linear" width={18} />
                        Approve section
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscardDraft(selected._id)}
                        disabled={busyId === selected._id}
                        className="inline-flex items-center gap-2 min-h-11 px-5 rounded-lg border border-[#44403C]/90 bg-[#1C1917] text-[#A8A29E] text-sm font-medium hover:border-[#D97757]/25 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Icon icon="solar:close-circle-linear" width={18} />
                        Discard
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5">
                  <div className="max-w-prose">
                    <p className="text-sm text-[#D6D3D1] whitespace-pre-wrap leading-relaxed">
                      {selected.content}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#A8A29E]">
                Select a section from the list.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
