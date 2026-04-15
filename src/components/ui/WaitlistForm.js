"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Icon } from "@iconify/react";

export function WaitlistForm({ source = "hero", className = "" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);

  const joinWaitlist = useMutation(api.waitlist.join);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || status === "submitting") return;

    setStatus("submitting");
    try {
      const result = await joinWaitlist({ email, source });
      setAlreadySignedUp(result.alreadySignedUp);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400">
          <Icon icon="solar:check-circle-bold" width={18} height={18} />
          <span className="text-sm font-semibold font-space-grotesk">
            {alreadySignedUp ? "You're already on the list!" : "You're on the list!"}
          </span>
        </div>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E] font-space-grotesk">
          We&apos;ll email you when early access opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto ${className}`}>
      <div className="relative flex-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === "submitting"}
          className="w-full h-12 pl-4 pr-4 rounded-full border text-sm font-space-grotesk bg-white dark:bg-[#1C1917] border-[#D1CDC7] dark:border-[#44403C] text-[#1C1917] dark:text-white placeholder-[#A8A29E] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D] disabled:opacity-60 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={status === "submitting" || !email}
        className="h-12 px-6 rounded-full bg-accent text-white text-sm font-semibold font-space-grotesk hover:bg-accent-hover transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D]"
      >
        {status === "submitting" ? (
          <>
            <Icon icon="solar:refresh-linear" className="animate-spin" width={16} height={16} />
            Joining…
          </>
        ) : (
          "Get Early Access"
        )}
      </button>
      {status === "error" && (
        <p className="absolute -bottom-6 left-0 text-xs text-red-500 font-space-grotesk">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
