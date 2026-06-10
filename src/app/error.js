"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Last line of defense for render errors on routes
 * that don't have a closer boundary (marketing, auth, shared views).
 */
export default function RootError({ error, reset }) {
  useEffect(() => {
    console.error("[root error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-4 bg-[#141110]">
      <p className="font-instrument-serif text-2xl text-[#E7E5E4]">
        Something went wrong
      </p>
      <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="font-space-grotesk text-sm px-4 py-2 rounded-lg bg-[#D97757] text-[#1C1917] hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
