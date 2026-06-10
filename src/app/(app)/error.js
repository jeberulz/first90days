"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary for the authenticated app group. Catches
 * render errors and rejected Convex queries from any (app) page so a
 * single broken section doesn't take down the whole shell with Next's
 * default crash screen.
 */
export default function AppError({ error, reset }) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4">
      <p className="font-instrument-serif text-2xl text-[#E7E5E4]">
        Something went wrong
      </p>
      <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md">
        {error?.message || "An unexpected error occurred while loading this page."}
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
