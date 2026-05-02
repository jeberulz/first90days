"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";

// Standalone settings panel for the opt-in public share feature.
//
// Encapsulated in its own file so the giant settings/page.js doesn't grow
// even more. The settings page wires this in as a new tab.

function PublicLinkRow({ slug }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/p/${slug}`
    : `/p/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // navigator.clipboard requires HTTPS in some browsers; fall back
      // to a manual select hint by making the input focusable.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="flex-1 bg-[#0F0E0D] border border-[#2C2825] rounded-lg px-3 py-2 font-mono text-xs text-[#E7E5E4] focus:outline-none"
      />
      <button
        type="button"
        onClick={copy}
        className="px-3 py-2 rounded-lg bg-[#D97757] hover:bg-[#C26242] text-white text-xs font-medium font-space-grotesk transition-colors flex items-center gap-1.5"
      >
        <Icon icon={copied ? "solar:check-circle-bold" : "solar:copy-linear"} width={14} />
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={`/p/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="px-3 py-2 rounded-lg border border-[#2C2825] text-[#E7E5E4] hover:border-[#D97757] text-xs font-space-grotesk transition-colors"
      >
        Open
      </a>
    </div>
  );
}

export default function PublicSharingPanel() {
  const settings = useQuery(api.publicPlans.getMyPublicSettings);
  const enableSharing = useMutation(api.publicPlans.enablePublicSharing);
  const disableSharing = useMutation(api.publicPlans.disablePublicSharing);
  const updateVisibility = useMutation(api.publicPlans.updatePublicVisibility);

  // Local optimistic copy of the form fields.
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [showCompany, setShowCompany] = useState(false);
  const [showStakeholderRoles, setShowStakeholderRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Hydrate local form state once, the first time the server settings
  // arrive. Stored in a ref so subsequent re-renders don't clobber the
  // user's in-progress typing.
  //
  // Calling setState directly in render bodies throws under the React 19
  // react-hooks/set-state-in-effect rule we adopted in PR #25, so this
  // is deferred to a microtask via Promise.resolve().then(...).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!settings || hydratedRef.current) return;
    hydratedRef.current = true;
    Promise.resolve().then(() => {
      setDisplayNameInput(settings.displayName ?? "");
      setShowCompany(settings.showCompany);
      setShowStakeholderRoles(settings.showStakeholderRoles);
    });
  }, [settings]);

  if (settings === undefined) {
    return (
      <div className="space-y-3">
        <div className="h-6 bg-[#1C1917] rounded w-1/3 animate-pulse" />
        <div className="h-24 bg-[#1C1917] rounded animate-pulse" />
      </div>
    );
  }

  if (settings === null) {
    return (
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
        <h3 className="font-space-grotesk text-base font-medium text-[#E7E5E4] mb-1">
          Generate your plan first
        </h3>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          You can share a public link once your 90-day plan has been generated.
        </p>
      </div>
    );
  }

  const enabled = settings.enabled;

  async function onEnable() {
    setError("");
    setSubmitting(true);
    try {
      await enableSharing({
        displayName: displayNameInput || undefined,
        showCompany,
        showStakeholderRoles,
      });
    } catch (e) {
      setError(e?.message ?? "Couldn't enable sharing.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDisable() {
    setError("");
    setSubmitting(true);
    try {
      await disableSharing({});
    } catch (e) {
      setError(e?.message ?? "Couldn't disable sharing.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onUpdate() {
    setError("");
    setSubmitting(true);
    try {
      await updateVisibility({
        displayName: displayNameInput || undefined,
        showCompany,
        showStakeholderRoles,
      });
    } catch (e) {
      setError(e?.message ?? "Couldn't update settings.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-instrument-serif text-2xl text-[#E7E5E4] mb-1">
          Public sharing
        </h2>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          Generate a public read-only link to your plan. Useful for
          LinkedIn, sharing with a recruiter, or showing off your
          ramp-up. Sensitive fields (stakeholder names, journal entries,
          knowledge base) stay private.
        </p>
      </div>

      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-space-grotesk text-sm font-medium text-[#E7E5E4]">
              {enabled ? "Public link is on" : "Public link is off"}
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E] mt-0.5">
              {enabled
                ? "Anyone with the link can view your plan."
                : "Turn this on to generate a shareable URL."}
            </p>
          </div>
          {enabled ? (
            <button
              type="button"
              onClick={onDisable}
              disabled={submitting}
              className="px-3.5 py-2 rounded-lg border border-[#2C2825] text-[#A8A29E] hover:border-[#D97757] hover:text-[#D97757] text-xs font-medium font-space-grotesk transition-colors disabled:opacity-60"
            >
              Turn off
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnable}
              disabled={submitting}
              className="px-3.5 py-2 rounded-lg bg-[#D97757] hover:bg-[#C26242] text-white text-xs font-medium font-space-grotesk transition-colors disabled:opacity-60"
            >
              Turn on
            </button>
          )}
        </div>

        {enabled && settings.publicSlug ? (
          <div className="border-t border-[#2C2825] pt-4">
            <p className="font-space-grotesk text-xs uppercase tracking-[0.6px] text-[#A8A29E] mb-2">
              Your public URL
            </p>
            <PublicLinkRow slug={settings.publicSlug} />
          </div>
        ) : null}

        {/* Display options — only relevant when enabled, but visible
            ahead of time so users see what they're opting into. */}
        <div className="border-t border-[#2C2825] pt-4 space-y-4">
          <div>
            <label
              htmlFor="public-display-name"
              className="block font-space-grotesk text-xs font-medium text-[#A8A29E] mb-1.5"
            >
              Display name
              <span className="ml-1.5 text-[#57534E]">
                (defaults to &ldquo;Anonymous Arcora user&rdquo;)
              </span>
            </label>
            <input
              id="public-display-name"
              name="public-display-name"
              type="text"
              autoComplete="off"
              maxLength={80}
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="e.g. Sarah J., Senior PM"
              className="w-full bg-[#0F0E0D] border border-[#2C2825] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:border-[#D97757]"
            />
          </div>

          <Toggle
            label="Show my company name"
            help="When off, your company is shown as “[Confidential]”."
            checked={showCompany}
            onChange={setShowCompany}
          />

          <Toggle
            label="Show stakeholder roles"
            help="Roles only — names and personal details are never shown."
            checked={showStakeholderRoles}
            onChange={setShowStakeholderRoles}
          />

          {enabled ? (
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={onUpdate}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#D97757] hover:bg-[#C26242] text-white text-xs font-medium font-space-grotesk transition-colors disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="border-t border-[#2C2825] pt-4">
            <p className="font-space-grotesk text-sm text-red-400">{error}</p>
          </div>
        ) : null}
      </div>

      <div className="bg-[#1C1917]/50 border border-[#2C2825]/60 rounded-xl p-4">
        <p className="font-space-grotesk text-xs text-[#A8A29E] leading-relaxed">
          <strong className="text-[#E7E5E4]">Privacy:</strong> Your real
          name and email are never shown on a public plan. Stakeholder
          names, journal entries, knowledge base notes, and approval
          comments are also private. Public plans are not indexed by search
          engines unless you explicitly opt in (post-launch feature).
        </p>
      </div>
    </div>
  );
}

function Toggle({ label, help, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-space-grotesk text-sm text-[#E7E5E4]">{label}</p>
        {help ? (
          <p className="font-space-grotesk text-xs text-[#A8A29E] mt-0.5">
            {help}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-1 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-[#D97757]" : "bg-[#2C2825]"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
