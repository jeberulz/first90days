"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Inline comment thread on a plan target (activity, week, goal, …).
 *
 * Renders compact when there are no comments — a single "Add comment" link —
 * and expands into a list + composer once opened or once any comments exist.
 * Works for both the owner viewing their own plan and a manager viewing a
 * shared plan, because every Convex call is scoped by planId and authorized
 * server-side via planCollaborators.
 */
export default function CommentThread({
  planId,
  targetType,
  targetId,
  compact = false,
}) {
  const comments = useQuery(api.planComments.listForTarget, {
    planId,
    targetType,
    targetId,
  });
  const addComment = useMutation(api.planComments.add);
  const removeComment = useMutation(api.planComments.remove);
  const resolveComment = useMutation(api.planComments.resolve);
  const reopenComment = useMutation(api.planComments.reopen);

  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = comments ?? [];
  const unresolved = list.filter((c) => !c.resolvedAt);
  const showThread = open || list.length > 0;

  async function submit(e) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      await addComment({ planId, targetType, targetId, body });
      setDraft("");
      setOpen(true);
    } catch (err) {
      console.error("[CommentThread] add failed", err);
      alert(err?.message || "Could not post comment");
    } finally {
      setBusy(false);
    }
  }

  if (!showThread) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#D97757] transition inline-flex items-center gap-1.5"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h10v7H6l-3 2v-2H2V3z" />
        </svg>
        Add comment
      </button>
    );
  }

  return (
    <div className={`${compact ? "mt-2" : "mt-3"} space-y-3`}>
      {list.length > 0 && (
        <div className="flex items-center gap-2">
          <p className="font-space-grotesk text-[10px] uppercase tracking-[0.6px] text-[#78716C]">
            {list.length} comment{list.length === 1 ? "" : "s"}
          </p>
          {unresolved.length > 0 && unresolved.length !== list.length && (
            <span className="font-space-grotesk text-[10px] text-[#D97757]">
              {unresolved.length} open
            </span>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {list.map((c) => (
          <li
            key={c._id}
            className={`rounded-lg border p-3 ${
              c.resolvedAt
                ? "border-[#2C2825] bg-[#1C1917]/50 opacity-70"
                : "border-[#2C2825] bg-[#1C1917]"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-space-grotesk text-xs font-medium text-[#E7E5E4]">
                {c.authorName || "Unnamed"}
                <span className="ml-1.5 font-normal text-[10px] uppercase tracking-[0.4px] text-[#78716C]">
                  {c.authorRole}
                </span>
              </p>
              <span className="font-space-grotesk text-[10px] text-[#78716C]">
                {new Date(c.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="mt-1.5 font-space-grotesk text-sm text-[#E7E5E4] whitespace-pre-wrap break-words">
              {c.body}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {c.resolvedAt ? (
                <button
                  type="button"
                  onClick={() => reopenComment({ id: c._id })}
                  className="font-space-grotesk text-[11px] text-[#A8A29E] hover:text-[#E7E5E4] transition"
                >
                  Reopen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => resolveComment({ id: c._id })}
                  className="font-space-grotesk text-[11px] text-[#A8A29E] hover:text-[#D97757] transition"
                >
                  Mark resolved
                </button>
              )}
              {c.canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this comment?")) {
                      removeComment({ id: c._id });
                    }
                  }}
                  className="font-space-grotesk text-[11px] text-[#A8A29E] hover:text-red-400 transition"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a comment for the owner or manager…"
          className="w-full bg-[#0F0E0D] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 resize-none"
        />
        <div className="flex items-center justify-end gap-2">
          {open && list.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDraft("");
              }}
              className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="font-space-grotesk text-xs px-3 py-1.5 rounded-md bg-[#D97757] text-white hover:bg-[#C26242] transition disabled:opacity-50"
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
