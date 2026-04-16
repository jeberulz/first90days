"use client";

import Link from "next/link";

export default function NoPlanEmptyState({
  heading,
  description,
  ctaLabel,
  ctaHref,
  resumeStep,
  companyName,
}) {
  const href = ctaHref || (resumeStep ? `/onboarding/${resumeStep}` : "/onboarding/1");
  const label = ctaLabel || (resumeStep && resumeStep > 1 ? "Continue setup" : "Complete setup");
  const desc = description || (
    companyName
      ? `Complete onboarding to build your plan at ${companyName}.`
      : "Complete onboarding to generate your personalised 90-day plan."
  );

  return (
    <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 sm:p-8 text-center space-y-4">
      <h2 className="font-instrument-serif text-2xl text-[#E7E5E4]">
        {heading}
      </h2>
      <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md mx-auto">
        {desc}
      </p>
      <div>
        <Link
          href={href}
          className="inline-flex bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
