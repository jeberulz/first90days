"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import SoftBlockBanner from "./SoftBlockBanner";
import LoadingSkeleton from "./LoadingSkeleton";

const TURN_LIMIT = 10;

export default function ChatThread({ activityId, onCapped, onMarkDone }) {
  const data = useQuery(api.whispererThreads.listByActivity, { activityId });
  const continueThread = useAction(api.whisperer.continueThread);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastCap, setLastCap] = useState(null);
  const inputRef = useRef(null);

  const thread = data?.thread || null;
  const turns = data?.turns || [];
  const status = thread?.status || "open";
  const turnCount = thread?.turnCount ?? 0;
  const capped = status === "capped" || status === "closed";

  useEffect(() => {
    if (capped && !lastCap) {
      setLastCap({
        reason: thread?.cappedReason || "capped",
        recap: turns.length ? turns[turns.length - 1]?.content : null,
      });
      onCapped?.();
    }
  }, [capped, lastCap, thread?.cappedReason, turns, onCapped]);

  async function send(e) {
    e?.preventDefault?.();
    const message = input.trim();
    if (!message || busy || capped || !thread) return;
    setBusy(true);
    setError(null);
    try {
      const res = await continueThread({ threadId: thread._id, message });
      if (res.status !== "ok") {
        setError(res.reason || res.status);
        if (res.status === "thread_closed" || res.capped) {
          setLastCap({
            reason: res.reason || res.options?.[0]?.key || "capped",
            recap: res.recap || null,
            centsCapped: res.cents_capped === true,
            escalateCopyText: res.escalate?.copyText || null,
          });
          onCapped?.();
        }
      } else if (res.capped) {
        setLastCap({
          reason: "turn_limit",
          recap: res.recap || null,
          escalateCopyText: res.escalate?.copyText || null,
        });
        onCapped?.();
      }
      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err?.message || "send_failed");
    } finally {
      setBusy(false);
    }
  }

  if (data === undefined) return null;

  return (
    <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
      <div className="flex items-center justify-between text-[11px] text-stone-500">
        <span>{turnCount} of {TURN_LIMIT}</span>
        {error ? <span className="text-amber-400">{error}</span> : null}
      </div>

      {turns.length > 0 && (
        <ol className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {turns.map((t) => (
            <li
              key={t._id}
              className={
                t.role === "user"
                  ? "rounded-md bg-stone-900/60 border border-white/5 p-2 text-sm text-stone-200"
                  : "rounded-md bg-[#1F1510]/40 border border-[#D97757]/15 p-2 text-sm text-stone-200"
              }
            >
              <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">
                {t.role}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{t.content}</div>
            </li>
          ))}
        </ol>
      )}

      {busy && <LoadingSkeleton />}

      {capped || lastCap ? (
        <SoftBlockBanner
          reason={lastCap?.reason}
          centsCapped={lastCap?.centsCapped}
          recap={lastCap?.recap}
          escalateCopyText={lastCap?.escalateCopyText}
          onMarkDone={onMarkDone}
          onClose={() => {}}
        />
      ) : (
        <form onSubmit={send} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="keep going…"
            className="flex-1 rounded-md bg-stone-950/60 border border-white/10 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-[#D97757]/40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="text-xs px-3 py-2 rounded-md bg-[#D97757] text-stone-950 hover:bg-[#E89070] disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Icon icon="solar:plain-2-linear" width={12} height={12} />
            send
          </button>
        </form>
      )}
    </div>
  );
}
