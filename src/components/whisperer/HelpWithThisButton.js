"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WhispererResponse from "./WhispererResponse";
import { bumpWhispererInvocationCount } from "./AssumptionsBlock";

export default function HelpWithThisButton({ activityId, taskCategory, onMarkDone }) {
  const respond = useAction(api.whisperer.respond);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);

  async function invoke(forceFullOverride = false) {
    setPending(true);
    try {
      const res = await respond({
        activityId,
        ...(forceFullOverride ? { force_full: true } : {}),
      });
      setResult(res);
      if (res?.status === "ok") bumpWhispererInvocationCount();
    } catch (err) {
      setResult({ status: "provider_unavailable", reason: err?.message || "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      {!result && !pending && (
        <button
          type="button"
          onClick={() => invoke(false)}
          className="inline-flex items-center gap-1.5 text-xs text-[#D97757] hover:text-[#E89070]"
        >
          <Icon icon="solar:lightbulb-bolt-linear" width={14} height={14} />
          help with this
        </button>
      )}
      {(pending || result) && (
        <WhispererResponse
          result={result}
          pending={pending}
          activityId={activityId}
          taskCategory={taskCategory}
          onRetryForceFull={() => invoke(true)}
          onClose={() => setResult(null)}
          onMarkDone={onMarkDone}
        />
      )}
    </div>
  );
}
