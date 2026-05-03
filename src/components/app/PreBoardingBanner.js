"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

function formatStartDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const STORAGE_PREFIX = "preBoardingBannerDismissed:";

export default function PreBoardingBanner({ startDate, peekHref = "/plan/week/1" }) {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!startDate) return;
    let next = false;
    try {
      next = window.localStorage.getItem(STORAGE_PREFIX + startDate) === "1";
    } catch {
      // localStorage unavailable; keep banner visible.
    }
    // Hydration-safe localStorage read: state must come from the effect,
    // because reading window during render would mismatch SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(next);
    setHydrated(true);
  }, [startDate]);

  if (!startDate || dismissed) return null;
  // Avoid SSR/CSR mismatch flash for the dismiss state.
  if (!hydrated) return null;

  function handleDismiss() {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + startDate, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <aside
      role="status"
      className="bg-accent/5 border border-accent/30 rounded-xl px-4 py-3 flex items-start gap-3 motion-safe:animate-fade-in-up"
    >
      <Icon
        icon="solar:calendar-mark-linear"
        className="w-5 h-5 text-accent shrink-0 mt-0.5"
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <p className="font-space-grotesk text-sm text-warm-line leading-snug">
          Your plan starts{" "}
          <span className="font-medium text-accent">
            {formatStartDate(startDate)}
          </span>
          .
        </p>
        <p className="font-space-grotesk text-xs text-warm-300 mt-0.5">
          Browse upcoming tasks below or peek at{" "}
          <Link
            href={peekHref}
            className="underline underline-offset-2 hover:text-warm-line"
          >
            week 1
          </Link>
          .
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1 -m-1 rounded text-warm-300 hover:text-warm-line transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Icon icon="solar:close-circle-linear" className="w-4 h-4" />
      </button>
    </aside>
  );
}
