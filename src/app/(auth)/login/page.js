"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";

const MAX_CLIENT_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const failCount = useRef(0);

  const clearMyAttempts = useMutation(api.loginAttempts.clearMyAttempts);

  useEffect(() => {
    if (lockoutMs <= 0) return;
    const id = setInterval(() => {
      setLockoutMs((ms) => {
        if (ms <= 1000) {
          clearInterval(id);
          return 0;
        }
        return ms - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutMs]);

  const lockedOut = lockoutMs > 0;
  const lockoutMinutes = Math.ceil(lockoutMs / 60000);

  async function handleSubmit(e) {
    e.preventDefault();
    if (lockedOut) return;
    setError(null);
    setLoading(true);

    try {
      await signIn("password", { email, password, flow: "signIn" });
      failCount.current = 0;
      clearMyAttempts().catch(() => {});
      router.push("/dashboard");
    } catch {
      failCount.current += 1;
      if (failCount.current >= MAX_CLIENT_ATTEMPTS) {
        setLockoutMs(LOCKOUT_MS);
        failCount.current = 0;
        setError(null);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-instrument-serif text-3xl sm:text-4xl text-[#1C1917] tracking-[-0.5px] sm:tracking-[-0.9px] leading-tight">
          Welcome back
        </h1>
        <p className="mt-3 font-space-grotesk text-sm sm:text-base text-[#57534E]">
          Sign in to continue your 90-day plan
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {lockedOut && (
          <div
            className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 font-space-grotesk"
            role="alert"
          >
            Too many failed attempts. Try again in {lockoutMinutes}{" "}
            {lockoutMinutes === 1 ? "minute" : "minutes"}.
          </div>
        )}
        {error && !lockedOut && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-space-grotesk">
            {error}
          </div>
        )}

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#1C1917] placeholder:text-[#D1CDC7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block font-space-grotesk text-sm font-medium text-[#1C1917]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="font-space-grotesk text-xs text-[#D97757] hover:text-[#C26242] font-medium transition"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#1C1917] placeholder:text-[#D1CDC7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading || lockedOut}
          className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "Signing in..." : lockedOut ? "Locked" : "Sign in"}
        </button>
      </form>

      <p className="text-center font-space-grotesk text-sm text-[#57534E]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-[#D97757] hover:text-[#C26242] font-medium transition"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
