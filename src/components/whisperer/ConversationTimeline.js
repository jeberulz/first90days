"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import SoftBlockBanner from "./SoftBlockBanner";
import LoadingSkeleton from "./LoadingSkeleton";
import AssumptionsBlock from "./AssumptionsBlock";

const TURN_LIMIT = 10;
const DEFAULT_VISIBLE = 2;

/**
 * Unified conversation transcript. Replaces the prior dual-zone
 * design (hero summary + ChatThread list) where the latest assistant
 * turn rendered twice. Now: one chronological list of turns plus an
 * inline input. No per-turn borders; differentiation by alignment +
 * role chip.
 *
 * Owns `listByActivity` subscription, `continueThread` invocation, the
 * cap state machine, and the optimistic-render slot for a just-fired
 * turn that hasn't yet appeared in Convex reactivity.
 */
export default function ConversationTimeline({
  activityId,
  freshResult,
  onMarkDone,
}) {
  const data = useQuery(api.whispererThreads.listByActivity, { activityId });
  const continueThread = useAction(api.whisperer.continueThread);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastCap, setLastCap] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const thread = data?.thread || null;
  const rawTurns = data?.turns;
  const status = thread?.status || "open";
  const turnCount = thread?.turnCount ?? 0;
  const capped = status === "capped" || status === "closed";

  // Merge a just-fired assistant turn (from the action's return) if it
  // hasn't yet appeared in the persisted list. Prevents the empty-flash
  // between action-return and Convex reactivity catching up.
  const turns = useMemo(() => {
    const persistedTurns = rawTurns || [];
    const sorted = [...persistedTurns].sort(
      (a, b) => (a.seq ?? 0) - (b.seq ?? 0)
    );
    if (!freshResult?.turnId) return sorted;
    const alreadyPersisted = sorted.some((t) => t._id === freshResult.turnId);
    if (alreadyPersisted) return sorted;
    return [
      ...sorted,
      {
        _id: freshResult.turnId,
        seq: sorted.length,
        role: "assistant",
        content: freshResult.coachingSummary || "",
        artifact: freshResult.artifact || "",
        assumptions: freshResult.assumptions || [],
        clarifyingQuestion: freshResult.clarifyingQuestion || "",
        _optimistic: true,
      },
    ];
  }, [rawTurns, freshResult]);

  // Auto-expand once a user actively sends or when there are 2 or
  // fewer turns. Otherwise default to the collapsed history view.
  const hiddenCount = Math.max(0, turns.length - DEFAULT_VISIBLE);
  const visibleTurns =
    expanded || turns.length <= DEFAULT_VISIBLE
      ? turns
      : turns.slice(turns.length - DEFAULT_VISIBLE);

  useEffect(() => {
    if (capped && !lastCap) {
      setLastCap({
        reason: thread?.cappedReason || "capped",
        recap: turns.length ? turns[turns.length - 1]?.content : null,
      });
    }
  }, [capped, lastCap, thread?.cappedReason, turns]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, busy]);

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
        }
      } else if (res.capped) {
        setLastCap({
          reason: "turn_limit",
          recap: res.recap || null,
          escalateCopyText: res.escalate?.copyText || null,
        });
      }
      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err?.message || "send_failed");
    } finally {
      setBusy(false);
    }
  }

  if (data === undefined && !freshResult) return null;

  return (
    <div className="space-y-3">
      <div ref={scrollRef} className="max-h-[28rem] overflow-y-auto pr-1">
        {hiddenCount > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mb-3 text-[11px] text-stone-500 hover:text-[#D97757] inline-flex items-center gap-1"
          >
            <Icon icon="solar:alt-arrow-up-linear" width={12} height={12} />
            show {hiddenCount} earlier message{hiddenCount === 1 ? "" : "s"}
          </button>
        )}
        <ol className="space-y-5">
          {visibleTurns.map((t) => (
            <TurnRow key={t._id} turn={t} />
          ))}
        </ol>
        {busy && (
          <div className="mt-4">
            <LoadingSkeleton />
          </div>
        )}
      </div>

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
        <form
          onSubmit={send}
          className="flex items-center gap-2 pt-2 border-t border-white/5"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="ask a follow-up"
            className="flex-1 bg-transparent text-sm text-stone-100 placeholder-stone-600 focus:outline-none"
          />
          {turnCount >= 8 && (
            <span className="text-[10px] text-stone-600">
              {turnCount} of {TURN_LIMIT}
            </span>
          )}
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="send"
            className="text-stone-500 hover:text-[#D97757] disabled:opacity-30"
          >
            <Icon icon="solar:plain-2-linear" width={16} height={16} />
          </button>
        </form>
      )}

      {error ? (
        <div className="text-[11px] text-amber-400">{error}</div>
      ) : null}
    </div>
  );
}

function TurnRow({ turn }) {
  const isUser = turn.role === "user";
  const isAssistant = turn.role === "assistant";

  const body =
    turn.clarifyingQuestion && turn.clarifyingQuestion.trim()
      ? turn.clarifyingQuestion
      : turn.content || "";

  if (isUser) {
    return (
      <li className="flex justify-end">
        <div className="max-w-prose text-sm text-stone-400 whitespace-pre-wrap leading-relaxed">
          {body}
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${
          isAssistant ? "bg-[#D97757]" : "bg-stone-600"
        }`}
      />
      <div className="flex-1 min-w-0 max-w-prose">
        <p className="text-sm text-stone-100 whitespace-pre-wrap leading-relaxed">
          {body}
        </p>
        {turn.artifact && turn.artifact.trim() ? (
          <ArtifactBlock text={turn.artifact} />
        ) : null}
        <AssumptionsBlock assumptions={turn.assumptions} />
      </div>
    </li>
  );
}

function ArtifactBlock({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <div className="mt-3 rounded-md bg-stone-950/60 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-stone-600">draft</span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] inline-flex items-center gap-1 text-stone-500 hover:text-[#D97757]"
        >
          <Icon
            icon={copied ? "solar:check-circle-linear" : "solar:copy-linear"}
            width={12}
            height={12}
          />
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="text-xs text-stone-200 whitespace-pre-wrap font-sans leading-relaxed">
        {text}
      </pre>
    </div>
  );
}
