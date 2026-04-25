"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";

/**
 * Public invite-accept page. Three states:
 *   1. token unknown / expired / revoked → friendly error
 *   2. authed user → "Accept" button → exchanges the token, routes to /shared
 *   3. unauthed user → inline sign-in / sign-up form (re-uses Password
 *      provider) which then accepts the invite and routes through
 *
 * Sits outside the (app) and (auth) groups so it doesn't fight either
 * layout's auth/onboarding gates.
 */
export default function InviteAcceptPage({ params }) {
  const { token } = use(params);
  const preview = useQuery(api.collaboration.getByToken, { token });
  const { isAuthenticated, isLoading } = useConvexAuth();
  const acceptInvitation = useMutation(api.collaboration.acceptInvitation);
  const router = useRouter();

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(false);

  // Guard so strict-mode / double-fire cannot trigger two accept calls and
  // the effect body itself does not call setState synchronously.
  const startedRef = useRef(false);

  // Auto-accept once the user is authenticated and we have an invite preview
  // in pending state. The setState calls are all inside async .then/.catch/
  // .finally callbacks — synchronous to the effect body we only kick off
  // the external API call, which is exactly what effects are for.
  useEffect(() => {
    if (
      startedRef.current ||
      accepted ||
      !isAuthenticated ||
      !preview ||
      preview.status !== "pending"
    ) {
      return;
    }
    startedRef.current = true;
    const promise = acceptInvitation({ token });
    // Flip accepting=true on the next microtask so it is not a synchronous
    // setState during effect execution.
    Promise.resolve().then(() => setAccepting(true));
    promise
      .then((res) => {
        setAccepted(true);
        router.push(`/shared/${res.planId}`);
      })
      .catch((err) => {
        setError(err?.message || "Could not accept invitation");
        startedRef.current = false;
      })
      .finally(() => setAccepting(false));
  }, [isAuthenticated, preview, accepted, acceptInvitation, token, router]);

  if (preview === undefined || isLoading) {
    return <Frame>Loading invitation…</Frame>;
  }

  if (preview === null) {
    return (
      <Frame>
        <h1 className="font-instrument-serif text-3xl text-[#1C1917]">
          Invitation not found
        </h1>
        <p className="mt-3 font-space-grotesk text-sm text-[#57534E]">
          This share link is invalid or has been revoked.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 font-space-grotesk text-sm text-[#D97757] hover:underline"
        >
          ← Back to First90
        </Link>
      </Frame>
    );
  }

  if (preview.status !== "pending") {
    const labelByStatus = {
      accepted: "This invitation has already been accepted.",
      revoked: "This invitation has been revoked by the plan owner.",
      expired: "This invitation has expired — ask the owner for a fresh link.",
    };
    return (
      <Frame>
        <h1 className="font-instrument-serif text-3xl text-[#1C1917]">
          Invitation unavailable
        </h1>
        <p className="mt-3 font-space-grotesk text-sm text-[#57534E]">
          {labelByStatus[preview.status] || "This invitation can't be used."}
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 font-space-grotesk text-sm text-[#D97757] hover:underline"
        >
          Sign in to First90 →
        </Link>
      </Frame>
    );
  }

  return (
    <Frame>
      <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#A8A29E]">
        You&apos;ve been invited
      </p>
      <h1 className="mt-2 font-instrument-serif text-3xl text-[#1C1917] tracking-[-0.6px] leading-[36px]">
        {preview.ownerName
          ? `${preview.ownerName.split(" ")[0]} wants your eyes on their 90-day plan`
          : "You've been invited to review a 90-day plan"}
      </h1>
      {(preview.roleTitle || preview.companyName) && (
        <p className="mt-3 font-space-grotesk text-sm text-[#57534E]">
          {preview.roleTitle}
          {preview.roleTitle && preview.companyName ? " · " : ""}
          {preview.companyName}
        </p>
      )}
      {preview.message && (
        <blockquote className="mt-4 border-l-2 border-[#D97757] pl-3 font-space-grotesk text-sm italic text-[#57534E]">
          “{preview.message}”
        </blockquote>
      )}

      {error && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-space-grotesk text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {isAuthenticated ? (
          <button
            type="button"
            disabled={accepting || accepted}
            onClick={async () => {
              setAccepting(true);
              setError(null);
              try {
                const res = await acceptInvitation({ token });
                setAccepted(true);
                router.push(`/shared/${res.planId}`);
              } catch (err) {
                setError(err?.message || "Could not accept invitation");
              } finally {
                setAccepting(false);
              }
            }}
            className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            {accepting
              ? "Opening shared plan…"
              : "Accept and open shared plan"}
          </button>
        ) : (
          <SignInOrSignUp invitedEmail={preview.invitedEmail} />
        )}
      </div>
    </Frame>
  );
}

function Frame({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F2E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E7E5E4] p-8">
        {children}
      </div>
    </div>
  );
}

function SignInOrSignUp({ invitedEmail }) {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState("signUp");
  const [email, setEmail] = useState(invitedEmail || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signIn") {
        await signIn("password", { email, password, flow: "signIn" });
      } else {
        await signIn("password", {
          email,
          password,
          name,
          flow: "signUp",
        });
      }
      // The parent useEffect will detect isAuthenticated and auto-accept.
    } catch (err) {
      setError(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("signUp")}
          className={`flex-1 py-1.5 rounded-md font-space-grotesk transition ${
            mode === "signUp"
              ? "bg-[#1C1917] text-white"
              : "border border-[#E7E5E4] text-[#57534E]"
          }`}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => setMode("signIn")}
          className={`flex-1 py-1.5 rounded-md font-space-grotesk transition ${
            mode === "signIn"
              ? "bg-[#1C1917] text-white"
              : "border border-[#E7E5E4] text-[#57534E]"
          }`}
        >
          Sign in
        </button>
      </div>

      {mode === "signUp" && (
        <div>
          <label className="block font-space-grotesk text-xs font-medium text-[#1C1917] mb-1">
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
          />
        </div>
      )}

      <div>
        <label className="block font-space-grotesk text-xs font-medium text-[#1C1917] mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
        />
      </div>

      <div>
        <label className="block font-space-grotesk text-xs font-medium text-[#1C1917] mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-space-grotesk text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm disabled:opacity-50"
      >
        {busy
          ? "Continuing…"
          : mode === "signUp"
            ? "Create account & open plan"
            : "Sign in & open plan"}
      </button>
    </form>
  );
}
