"use client";

import Link from "next/link";

export default function NoPlanEmptyState({
  heading,
  description,
  ctaLabel = "Complete setup",
  ctaHref = "/onboarding/1",
}) {
  return (
    <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 sm:p-8 text-center space-y-4">
      <h2 className="font-instrument-serif text-2xl text-[#E7E5E4]">
        {heading}
      </h2>
      <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md mx-auto">
        {description}
      </p>
      <div>
        <Link
          href={ctaHref}
          className="inline-flex bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
