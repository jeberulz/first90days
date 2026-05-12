"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WhispererResponse from "./WhispererResponse";
import { envelopeFromTurns } from "./envelopeFromTurns";

export default function HelpWithThisButton({ activityId, taskCategory, onMarkDone }) {
  const respond = useAction(api.whisperer.respond);
  const persisted = useQuery(api.whispererThreads.listByActivity, { activityId });
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);

  const resumeEnvelope =
    persisted && persisted.thread && persisted.thread.status === "open"
      ? envelopeFromTurns(persisted.thread, persisted.turns)
      : null;
  const cappedThread =
    persisted && persisted.thread && persisted.thread.status === "capped"
      ? persisted
      : null;

  async function invoke(forceFullOverride = false) {
    setPending(true);
    try {
      const res = await respond({
        activityId,
        ...(forceFullOverride ? { force_full: true } : {}),
      });
      setResult(res);
    } catch (err) {
      setResult({ status: "provider_unavailable", reason: err?.message || "error" });
    } finally {
      setPending(false);
    }
  }

  function resume() {
    const envelope = resumeEnvelope || envelopeFromCapped(cappedThread);
    if (!envelope) {
      invoke(false);
      return;
    }
    setResult(envelope);
  }

  if (pending || result) {
    return (
      <div className="w-full">
        <WhispererResponse
          result={result}
          pending={pending}
          activityId={activityId}
          taskCategory={taskCategory}
          onRetryForceFull={() => invoke(true)}
          onClose={() => setResult(null)}
          onMarkDone={onMarkDone}
        />
      </div>
    );
  }

  if (resumeEnvelope) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={resume}
          className="inline-flex items-center gap-1.5 text-xs text-[#D97757] hover:text-[#E89070]"
        >
          <Icon icon="solar:history-linear" width={14} height={14} />
          resume whisper
        </button>
      </div>
    );
  }

  if (cappedThread) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={resume}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#D97757]"
        >
          <Icon icon="solar:flag-2-linear" width={14} height={14} />
          view recap
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => invoke(false)}
        className="inline-flex items-center gap-1.5 text-xs text-[#D97757] hover:text-[#E89070]"
      >
        <Icon icon="solar:lightbulb-bolt-linear" width={14} height={14} />
        help with this
      </button>
    </div>
  );
}

function envelopeFromCapped(cappedData) {
  if (!cappedData) return null;
  return envelopeFromTurns(cappedData.thread, cappedData.turns);
}
