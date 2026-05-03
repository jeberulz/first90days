"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  passwordRequirements,
  passwordStrength,
  PASSWORD_MIN_LENGTH,
} from "@/lib/passwordValidation";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams?.get("intent") ?? null;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRequirements, setShowRequirements] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const reqs = passwordRequirements(password, email);
  const strength = passwordStrength(password, email);
  const allPassed = reqs.every((r) => r.passed);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }

    if (!allPassed) {
      const firstFailed = reqs.find((r) => !r.passed);
      setError(firstFailed?.label ?? "Password does not meet requirements.");
      setShowRequirements(true);
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        acceptedTerms: "true",
        marketingConsent: marketingOptIn ? "true" : "false",
        flow: "signUp",
      });
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("onboarding_data");
        if (intent === "trial") {
          // Read on the dashboard after onboarding to auto-start the local trial.
          // The mutation is idempotent, so this is safe even if it fires twice.
          try {
            sessionStorage.setItem("pending_intent", "trial");
          } catch {}
        }
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}&next=/onboarding`);
    } catch (err) {
      const message = err?.data ?? err?.message ?? "";
      const messageString = typeof message === "string" ? message : "";
      if (/already exists/i.test(messageString)) {
        router.push(
          `/login?email=${encodeURIComponent(email)}&reason=existing-account`
        );
        return;
      }
      setError(
        messageString && !/unauthenticated/i.test(messageString)
          ? messageString
          : "Could not create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="font-instrument-serif text-3xl sm:text-4xl text-[#1C1917] tracking-[-0.5px] sm:tracking-[-0.9px] leading-tight">
          Start your journey
        </h1>
        <p className="mt-3 font-space-grotesk text-sm sm:text-base text-[#57534E]">
          Create your account to plan your first 90 days
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-space-grotesk"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="firstName"
              className="block font-space-grotesk text-sm font-medium text-[#1C1917]"
            >
              First name
            </label>
            <input
              id="firstName"
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#1C1917] placeholder:text-[#D1CDC7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
              placeholder="Jane"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="lastName"
              className="block font-space-grotesk text-sm font-medium text-[#1C1917]"
            >
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#1C1917] placeholder:text-[#D1CDC7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
              placeholder="Doe"
            />
          </div>
        </div>

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
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block font-space-grotesk text-sm font-medium text-[#1C1917]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setShowRequirements(true)}
            className="w-full bg-white border border-[#E7E5E4] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#1C1917] placeholder:text-[#D1CDC7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] transition"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            aria-describedby="password-requirements"
          />

          {(showRequirements || password.length > 0) && (
            <div id="password-requirements" className="pt-2 space-y-2">
              <StrengthBar strength={strength} />
              <ul className="space-y-1">
                {reqs.map((r) => (
                  <li
                    key={r.id}
                    className={`flex items-center gap-2 font-space-grotesk text-xs ${
                      r.passed ? "text-emerald-700" : "text-[#57534E]"
                    }`}
                  >
                    <span aria-hidden="true" className="w-3 inline-flex justify-center">
                      {r.passed ? "✓" : "·"}
                    </span>
                    <span>{r.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 rounded border-[#E7E5E4] text-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 focus:ring-offset-0 cursor-pointer"
              aria-describedby="terms-description"
            />
            <span
              id="terms-description"
              className="font-space-grotesk text-xs text-[#57534E] leading-relaxed select-none"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D97757] hover:text-[#C26242] underline underline-offset-2 font-medium"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D97757] hover:text-[#C26242] underline underline-offset-2 font-medium"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#E7E5E4] text-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 focus:ring-offset-0 cursor-pointer"
              aria-describedby="marketing-description"
            />
            <span
              id="marketing-description"
              className="font-space-grotesk text-xs text-[#57534E] leading-relaxed select-none"
            >
              Send me occasional product updates and onboarding tips. You can
              unsubscribe at any time.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !agreedToTerms}
          className="w-full bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center font-space-grotesk text-sm text-[#57534E]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[#D97757] hover:text-[#C26242] font-medium transition"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function StrengthBar({ strength }) {
  const colors = {
    empty: "bg-[#E7E5E4]",
    weak: "bg-red-400",
    fair: "bg-amber-400",
    good: "bg-lime-500",
    strong: "bg-emerald-500",
  };
  const label = {
    empty: "Enter a password",
    weak: "Weak",
    fair: "Fair",
    good: "Good",
    strong: "Strong",
  }[strength.level];

  return (
    <div className="space-y-1">
      <div
        className="h-1.5 rounded-full bg-[#F5F2E8] overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={`h-full transition-all ${colors[strength.level] ?? colors.empty}`}
          style={{ width: `${Math.round(strength.score * 100)}%` }}
        />
      </div>
      <p className="font-space-grotesk text-xs text-[#57534E]">
        <span className="font-medium">{label}</span>{" "}
        <span className="text-[#A8A29E]">
          ({strength.passed}/{strength.total} requirements met)
        </span>
      </p>
    </div>
  );
}
