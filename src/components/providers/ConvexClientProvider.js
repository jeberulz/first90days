"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

/** Only used when NEXT_PUBLIC_CONVEX_URL is unset at build time — never a real Convex host. */
const PLACEHOLDER_CONVEX_URL = "https://build-missing-env.invalid";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || PLACEHOLDER_CONVEX_URL;

const convexClient =
  convexUrl === PLACEHOLDER_CONVEX_URL
    ? null
    : new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({ children }) {
  if (!convexClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0E0D] px-6 py-16 text-[#E7E5E4]">
        <div className="max-w-lg text-center space-y-4 font-space-grotesk">
          <p className="font-instrument-serif text-2xl text-[#E7E5E4]">
            Missing Convex URL
          </p>
          <p className="text-sm text-[#A8A29E] leading-relaxed">
            This build has no{" "}
            <code className="text-[#D97757]">NEXT_PUBLIC_CONVEX_URL</code>. In
            Vercel → Project → Settings → Environment Variables, set it to your
            deployment URL (e.g.{" "}
            <code className="text-[#D97757]">https://… .convex.cloud</code>),
            then trigger a new production deploy so the client bundle picks it
            up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConvexAuthProvider client={convexClient}>
      {children}
    </ConvexAuthProvider>
  );
}
