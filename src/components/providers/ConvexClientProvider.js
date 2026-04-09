"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

// ConvexReactClient throws on undefined; Next prerender runs without Convex env in some CI setups.
// Set NEXT_PUBLIC_CONVEX_URL on Vercel (required for a working deployed app).
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL?.trim() ||
  "https://build-missing-env.invalid";

const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({ children }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
