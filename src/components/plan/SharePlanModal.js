"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Share a plan with a manager: generate a tokenized invite link, list
 * pending invitations, list accepted collaborators, and let the owner
 * revoke or remove either side. The owner copies the link manually
 * (we don't send email yet) and forwards it however they want.
 */
export default function SharePlanModal({ planId, onClose }) {
  const invitations = useQuery(api.collaboration.listInvitations, { planId });
  const collaborators = useQuery(api.collaboration.listCollaborators, { planId });
  const inviteByEmail = useMutation(api.collaboration.inviteByEmail);
  const revokeInvitation = useMutation(api.collaboration.revokeInvitation);
  const removeCollaborator = useMutation(api.collaboration.removeCollaborator);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastInviteToken, setLastInviteToken] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function inviteUrl(token) {
    if (typeof window === "undefined") return `/invite/${token}`;
    return `${window.location.origin}/invite/${token}`;
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await inviteByEmail({
        planId,
        email: email.trim(),
        role: "manager",
        message: message.trim() || undefined,
      });
      setLastInviteToken(result.token);
      setCopied(false);
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err?.message || "Could not create invitation");
    } finally {
      setBusy(false);
    }
  }

  async function copy(token) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      setLastInviteToken(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Couldn't copy to clipboard — long-press the link to copy");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-plan-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 border-b border-[#2C2825]">
          <div>
            <h2
              id="share-plan-title"
              className="font-instrument-serif text-2xl text-[#E7E5E4]"
            >
              Share with your manager
            </h2>
            <p className="mt-1 font-space-grotesk text-sm text-[#A8A29E]">
              Invite people to read and comment on this 90-day plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A8A29E] hover:text-[#E7E5E4] transition"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={submit} className="space-y-3">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 font-space-grotesk text-sm text-red-300">
                {error}
              </div>
            )}
            <div>
              <label className="block font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-1.5">
                Manager email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@company.com"
                className="w-full bg-[#0F0E0D] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#D97757]/30"
              />
            </div>
            <div>
              <label className="block font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E] mb-1.5">
                Note (optional)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey — here's the 90-day plan I drafted. Open to feedback."
                className="w-full bg-[#0F0E0D] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition disabled:opacity-50"
            >
              {busy ? "Generating link…" : "Generate share link"}
            </button>
            <p className="font-space-grotesk text-xs text-[#78716C]">
              We don&apos;t send the email yet — you&apos;ll copy the link below
              and forward it however you like.
            </p>
          </form>

          {lastInviteToken && (
            <div className="bg-[#0F0E0D] border border-[#D97757]/40 rounded-lg p-3 space-y-2">
              <p className="font-space-grotesk text-xs font-medium text-[#D97757]">
                Share link ready
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs text-[#E7E5E4] bg-[#1C1917] px-2 py-1.5 rounded border border-[#2C2825] truncate">
                  {inviteUrl(lastInviteToken)}
                </code>
                <button
                  type="button"
                  onClick={() => copy(lastInviteToken)}
                  className="font-space-grotesk text-xs px-3 py-1.5 rounded-md border border-[#44403C] text-[#E7E5E4] hover:bg-[#292524] transition"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {invitations && invitations.length > 0 && (
            <div className="space-y-2">
              <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
                Pending & past invites
              </p>
              <ul className="space-y-2">
                {invitations.map((inv) => (
                  <li
                    key={inv._id}
                    className="flex items-center justify-between gap-3 bg-[#0F0E0D] border border-[#2C2825] rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-space-grotesk text-sm text-[#E7E5E4] truncate">
                        {inv.invitedEmail}
                      </p>
                      <p className="font-space-grotesk text-xs text-[#A8A29E]">
                        {inv.status === "pending" && "Pending"}
                        {inv.status === "accepted" && "Accepted"}
                        {inv.status === "revoked" && "Revoked"}
                        {inv.status === "expired" && "Expired"}
                        {" · "}
                        {inv.role}
                      </p>
                    </div>
                    {inv.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => copy(inv.token)}
                          className="font-space-grotesk text-xs px-2 py-1 rounded-md border border-[#44403C] text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#292524] transition"
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            revokeInvitation({ invitationId: inv._id })
                          }
                          className="font-space-grotesk text-xs text-[#A8A29E] hover:text-red-400 transition"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {collaborators && collaborators.length > 0 && (
            <div className="space-y-2">
              <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
                People with access
              </p>
              <ul className="space-y-2">
                {collaborators.map((c) => (
                  <li
                    key={c._id}
                    className="flex items-center justify-between gap-3 bg-[#0F0E0D] border border-[#2C2825] rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-space-grotesk text-sm text-[#E7E5E4] truncate">
                        {c.name || c.email || "Collaborator"}
                      </p>
                      <p className="font-space-grotesk text-xs text-[#A8A29E] truncate">
                        {c.email && c.name ? c.email : null} · {c.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Remove ${c.name || c.email}'s access to this plan?`
                          )
                        ) {
                          removeCollaborator({ collaboratorRowId: c._id });
                        }
                      }}
                      className="font-space-grotesk text-xs text-[#A8A29E] hover:text-red-400 transition"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
