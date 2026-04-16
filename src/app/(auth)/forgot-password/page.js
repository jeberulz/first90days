"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn("password", { email, flow: "reset" });
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      // Generic message so we don't leak which emails are registered.
      setError(
        "If that email is registered, a reset code is on its way. Try again in a minute if it hasn't arrived."
      );
      // Still advance the user — they can always retry from the reset page.
      setTimeout(
        () => router.push(`/reset-password?email=${encodeURIComponent(email)}`),
        1500
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-instrument-serif text-3xl sm:text-4xl text-[#1C1917] tracking-[-0.5px] sm:tracking-[-0.9px] leading-tight">
          Reset your password
        </h1>
        <p className="mt-3 font-space-grotesk text-sm sm:text-base text-[#57534E]">
          Enter your email and we&apos;ll send you a 8-digit code to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 font-space-grotesk"
            role="status"
          >
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "Sending code..." : "Send reset code"}
        </button>
      </form>

      <p className="text-center font-space-grotesk text-sm text-[#57534E]">
        Remembered it?{" "}
        <Link
          href="/login"
          className="text-[#D97757] hover:text-[#C26242] font-medium transition"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
