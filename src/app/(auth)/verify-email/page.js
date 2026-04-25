"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="font-space-grotesk text-sm text-[#57534E]">Loading…</div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/onboarding";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await signIn("password", {
        email,
        code: code.trim(),
        flow: "email-verification",
      });
      router.push(next);
    } catch (err) {
      const message = err?.data ?? err?.message ?? "";
      setError(
        message && typeof message === "string" && !/unauthenticated/i.test(message)
          ? message
          : "That code didn't work. Check for typos or request a new one."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      // Re-trigger signUp which re-sends the verification code. The
      // provider short-circuits if the account already exists, so this
      // safely acts as a "resend code" button post-signup.
      await signIn("password", { email, flow: "signUp" });
      setInfo("We sent you a new code. Check your inbox.");
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            clearInterval(interval);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch {
      setInfo("We sent you a new code. Check your inbox.");
      setResendCooldown(60);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-instrument-serif text-3xl sm:text-4xl text-[#1C1917] tracking-[-0.5px] sm:tracking-[-0.9px] leading-tight">
          Verify your email
        </h1>
        <p className="mt-3 font-space-grotesk text-sm sm:text-base text-[#57534E]">
          We sent an 8-digit code to{" "}
          <span className="font-medium text-[#1C1917]">{email || "your email"}</span>
          . Enter it below to finish setting up your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-space-grotesk"
            role="alert"
          >
            {error}
          </div>
        )}
        {info && !error && (
          <div
            className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800 font-space-grotesk"
            role="status"
          >
            {info}
          </div>
        )}

        {!initialEmail && (
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block font-space-grotesk text-sm font-medium text-[#1C1917]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#1C1917] placeholder:text-[#D1CDC7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="code"
            className="block font-space-grotesk text-sm font-medium text-[#1C1917]"
          >
            Verification code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2.5 font-space-grotesk text-sm tracking-widest text-[#1C1917] placeholder:text-[#D1CDC7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
            placeholder="12345678"
            maxLength={12}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "Verifying..." : "Verify email"}
        </button>
      </form>

      <div className="text-center font-space-grotesk text-sm text-[#57534E] space-y-2">
        <p>
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="text-[#D97757] hover:text-[#C26242] font-medium transition disabled:text-[#A8A29E] disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : resending
                ? "Sending..."
                : "Resend"}
          </button>
        </p>
        <p className="text-xs">
          Wrong email?{" "}
          <Link
            href="/signup"
            className="text-[#D97757] hover:text-[#C26242] font-medium transition"
          >
            Start over
          </Link>
        </p>
      </div>
    </div>
  );
}
