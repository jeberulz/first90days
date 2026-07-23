"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ConversationTimeline from "./ConversationTimeline";
import SmallTaskTip from "./SmallTaskTip";
import FallbackTip from "./FallbackTip";
import LoadingSkeleton from "./LoadingSkeleton";
import QuotaIndicator from "./QuotaIndicator";

function QuotaCeilingPanel({ envelope }) {
  const isCount = envelope.status === "over_count";
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <Icon
          icon="solar:bell-off-linear"
          className="text-amber-400 mt-0.5"
          width={16}
          height={16}
        />
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

export default function WhispererResponse({
  result,
  pending,
  activityId,
  taskCategory,
  onRetryForceFull,
  onMarkDone,
  onClose,
}) {
  const markDiscarded = useMutation(api.whispererTelemetry.markDiscarded);
  const closeThread = useMutation(api.whispererThreads.closeThread);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleMinimize() {
    onClose?.();
  }

  async function handleStartFresh() {
    try {
      if (activityId) await closeThread({ activityId });
    } catch {
      // best-effort
    }
    if (result?.turnId && result?.status === "ok") {
      try {
        await markDiscarded({ turnId: result.turnId });
      } catch {
        // best-effort
      }
    }
    onClose?.();
  }

  const enterClasses = entered
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-1";
  const baseTransition =
    "transition duration-200 ease-out motion-reduce:transition-none";

  if (pending && !result) {
    return (
      <div
        className={`mt-3 rounded-xl border border-[#D97757]/15 bg-stone-900/60 p-4 ${baseTransition} ${enterClasses}`}
      >
        <LoadingSkeleton />
      </div>
    );
  }

  if (!result) return null;

  const status = result.status;

  if (status === "unauthorized" || status === "not_found") {
    return (
      <div
        className={`mt-3 rounded-xl border border-white/10 bg-stone-900/60 p-4 text-sm text-stone-400 ${baseTransition} ${enterClasses}`}
      >
        Couldn&apos;t load this task. Refresh and try again.
      </div>
    );
  }

  if (status === "over_count" || status === "over_cents") {
    return (
      <div
        className={`mt-3 ${baseTransition} ${enterClasses}`}
      >
        <QuotaCeilingPanel envelope={result} />
      </div>
    );
  }

  if (status === "provider_unavailable") {
    return (
      <div className={`mt-3 ${baseTransition} ${enterClasses}`}>
        <FallbackTip taskCategory={taskCategory} />
      </div>
    );
  }

  if (status !== "ok") return null;

  if (result.path === "small") {
    return (
      <div className={`mt-3 ${baseTransition} ${enterClasses}`}>
        <SmallTaskTip
          tip={result.coachingSummary}
          onDraftItAnyway={onRetryForceFull}
        />
      </div>
    );
  }

  return (
    <div
      style={{ containerType: "inline-size" }}
      className={`mt-3 rounded-xl border border-[#D97757]/15 bg-stone-900/60 p-4 ${baseTransition} ${enterClasses}`}
    >
      <div className="flex items-center justify-end gap-2 mb-3">
        <QuotaIndicator remaining={result.remaining_whisperer_calls_est} />
        <OverflowMenu onStartFresh={handleStartFresh} />
        <button
          type="button"
          onClick={handleMinimize}
          className="text-stone-500 hover:text-stone-300"
          aria-label="minimize — your whisper is saved, resume anytime"
          title="Minimize — your whisper is saved, resume anytime"
        >
          <Icon icon="solar:minimize-square-linear" width={16} height={16} />
        </button>
      </div>

      <ConversationTimeline
        activityId={activityId}
        freshResult={result}
        onMarkDone={onMarkDone}
      />
    </div>
  );
}

function OverflowMenu({ onStartFresh }) {
  return (
    <details className="relative group [&_summary::-webkit-details-marker]:hidden">
      <summary
        className="list-none cursor-pointer text-stone-500 hover:text-stone-300 outline-none"
        aria-label="more actions"
      >
        <Icon icon="solar:menu-dots-linear" width={16} height={16} />
      </summary>
      <div className="absolute right-0 top-full mt-1 rounded-md border border-white/10 bg-stone-950 shadow-lg z-10 min-w-[10rem]">
        <button
          type="button"
          onClick={(e) => {
            const details = e.currentTarget.closest("details");
            if (details) details.open = false;
            onStartFresh?.();
          }}
          className="w-full text-left px-3 py-2 text-xs text-stone-200 hover:bg-white/5 inline-flex items-center gap-2"
        >
          <Icon icon="solar:refresh-linear" width={12} height={12} />
          Start fresh — discard this conversation
        </button>
      </div>
    </details>
  );
}
