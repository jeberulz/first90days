"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import AssumptionsBlock from "./AssumptionsBlock";
import QuotaIndicator from "./QuotaIndicator";
import SmallTaskTip from "./SmallTaskTip";
import FallbackTip from "./FallbackTip";
import ChatThread from "./ChatThread";
import LoadingSkeleton from "./LoadingSkeleton";

function CopyArtifactButton({ text, onCopy }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onCopy?.();
    } catch {
      // ignore
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="text-[11px] inline-flex items-center gap-1 text-stone-400 hover:text-[#D97757]"
    >
      <Icon icon={copied ? "solar:check-circle-linear" : "solar:copy-linear"} width={12} height={12} />
      {copied ? "copied" : "copy"}
    </button>
  );
}

function QuotaCeilingPanel({ envelope }) {
  const isCount = envelope.status === "over_count";
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <Icon icon="solar:bell-off-linear" className="text-amber-400 mt-0.5" width={16} height={16} />
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wide text-amber-400/80 mb-1">
            {isCount ? "daily call limit" : "daily ai budget reached"}
          </div>
          <p className="text-sm text-stone-200 leading-relaxed">
            {isCount
              ? "You've hit the free tier limit for today's whisperer calls."
              : "You've used a lot of AI today. More available tomorrow."}
          </p>
          <a
            href="/pricing"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[#D97757] hover:text-[#E89070]"
          >
            upgrade to Pro
            <Icon icon="solar:arrow-right-linear" width={12} height={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function WhispererResponse({
  result,
  pending,
  activityId,
  taskCategory,
  onRetryForceFull,
  onMarkDone,
  onClose,
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const markAccepted = useMutation(api.whispererTelemetry.markAccepted);
  const markDiscarded = useMutation(api.whispererTelemetry.markDiscarded);

  const turnId = result?.turnId;

  async function handleCopy() {
    if (!turnId) return;
    try {
      await markAccepted({ turnId, path: "copy" });
    } catch {
      // telemetry is fire-and-forget for the user
    }
  }

  async function handleClose() {
    if (turnId && result?.status === "ok") {
      try {
        await markDiscarded({ turnId });
      } catch {
        // telemetry is fire-and-forget for the user
      }
    }
    onClose?.();
  }

  if (pending) {
    return (
      <div className="mt-3 rounded-xl border border-[#D97757]/15 bg-stone-900/60 p-4">
        <LoadingSkeleton />
      </div>
    );
  }
  if (!result) return null;

  const status = result.status;
  if (status === "unauthorized" || status === "not_found") {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-stone-900/60 p-4 text-sm text-stone-400">
        Couldn't load this task. Refresh and try again.
      </div>
    );
  }
  if (status === "over_count" || status === "over_cents") {
    return (
      <div className="mt-3">
        <QuotaCeilingPanel envelope={result} />
      </div>
    );
  }
  if (status === "provider_unavailable") {
    return (
      <div className="mt-3">
        <FallbackTip taskCategory={taskCategory} />
      </div>
    );
  }
  if (status !== "ok") return null;

  if (result.path === "small") {
    return (
      <div className="mt-3">
        <SmallTaskTip
          tip={result.coachingSummary}
          onDraftItAnyway={onRetryForceFull}
        />
      </div>
    );
  }

  const isClarify = result.path === "clarify";

  return (
    <div className="mt-3 rounded-xl border border-[#D97757]/15 bg-stone-900/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#1F1510] text-[#D97757]">
            <Icon icon="solar:lightbulb-bolt-linear" width={14} height={14} />
          </div>
          <span className="text-[11px] uppercase tracking-wide text-[#D97757]/80">
            {isClarify ? "one question first" : "whisper"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <QuotaIndicator remaining={result.remaining_whisperer_calls_est} />
          <button
            type="button"
            onClick={handleClose}
            className="text-stone-500 hover:text-stone-300"
            aria-label="close"
          >
            <Icon icon="solar:close-circle-linear" width={16} height={16} />
          </button>
        </div>
      </div>

      {isClarify ? (
        <p className="text-sm text-stone-100 leading-relaxed">
          {result.clarifyingQuestion}
        </p>
      ) : (
        <>
          <p className="text-sm text-stone-100 leading-relaxed whitespace-pre-wrap">
            {result.coachingSummary}
          </p>
          {result.artifact && (
            <div className="mt-3 rounded-md border border-white/10 bg-stone-950/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wide text-stone-500">
                  draft
                </div>
                <CopyArtifactButton text={result.artifact} onCopy={handleCopy} />
              </div>
              <pre className="text-xs text-stone-200 whitespace-pre-wrap font-sans leading-relaxed">
                {result.artifact}
              </pre>
            </div>
          )}
          <AssumptionsBlock assumptions={result.assumptions} />
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!chatOpen ? (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="text-xs inline-flex items-center gap-1 text-[#D97757] hover:text-[#E89070]"
          >
            <Icon icon="solar:chat-round-line-linear" width={12} height={12} />
            keep going
          </button>
        ) : null}
      </div>

      {chatOpen && (
        <ChatThread
          activityId={activityId}
          onMarkDone={onMarkDone}
        />
      )}
    </div>
  );
}
