"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

// TODO: confirm final pricing before launch
const PRO_MONTHLY_PRICE = "$29";
const PRO_ANNUAL_PRICE = "$23";

const FREE_FEATURES = [
  { included: true, label: "1 active 90-day plan" },
  { included: true, label: "AI-generated plan (one time)" },
  { included: true, label: "5 AI enrichments per day" },
  { included: true, label: "Manager share link" },
  { included: true, label: "Progress tracking" },
  { included: false, label: "Unlimited AI enrichments" },
  { included: false, label: "Unlimited plan regeneration" },
];

const PRO_FEATURES = [
  { included: true, label: "Everything in Free" },
  { included: true, label: "100 AI enrichments per day" },
  { included: true, label: "Unlimited plan regeneration" },
  { included: true, label: "Priority AI processing" },
  { included: true, label: "Advanced progress analytics" },
  { included: true, label: "Export to PDF & Notion" },
  { included: true, label: "14-day free trial included" },
];

function FeatureRow({ included, label }) {
  return (
    <li className="flex items-center gap-2.5">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
          included
            ? "bg-accent/10 text-accent"
            : "bg-[#F5F2E8] dark:bg-[#292524] text-[#C7C3BE] dark:text-[#57534E]"
        }`}
      >
        <Icon
          icon={included ? "solar:check-read-linear" : "solar:close-square-linear"}
          width={10}
          height={10}
          aria-hidden
        />
      </div>
      <span
        className={`text-sm font-space-grotesk ${
          included
            ? "text-[#1C1917] dark:text-[#D6D3D1]"
            : "text-[#A8A29E] dark:text-[#57534E] line-through"
        }`}
      >
        {label}
      </span>
    </li>
  );
}

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  const proPrice = annual ? PRO_ANNUAL_PRICE : PRO_MONTHLY_PRICE;
  const proBillingLabel = annual ? "per month, billed annually" : "per month";

  return (
    <section
      id="pricing"
      className="py-16 sm:py-24 lg:py-32 relative border-t border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300 bg-[#F5F2E8] dark:bg-[#0F0E0D]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-accent mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="font-space-grotesk">Simple Pricing</span>
          </div>
          <h2 className="t-display-md tracking-tight mb-4 text-[#1C1917] dark:text-white">
            Start free.{" "}
            <span className="font-instrument-serif font-normal text-[#A8A29E]">
              Upgrade when you&apos;re ready.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] max-w-lg mx-auto leading-relaxed font-normal font-space-grotesk mb-8">
            No hidden fees. Cancel anytime. Your first 90 days are too important to leave to chance.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3">
            <span
              className={`text-sm font-space-grotesk font-medium transition-colors ${
                !annual ? "text-[#1C1917] dark:text-white" : "text-[#78716C] dark:text-[#A8A29E]"
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D] ${
                annual ? "bg-accent" : "bg-[#D1CDC7] dark:bg-[#44403C]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  annual ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-space-grotesk font-medium transition-colors ${
                  annual ? "text-[#1C1917] dark:text-white" : "text-[#78716C] dark:text-[#A8A29E]"
                }`}
              >
                Annual
              </span>
              {annual && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 text-[10px] font-bold text-green-600 dark:text-green-400 font-space-grotesk">
                  Save 20%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto mb-8">
          {/* Free card */}
          <div className="bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] rounded-2xl p-6 sm:p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#78716C] dark:text-[#A8A29E] font-space-grotesk mb-2">
                Free
              </p>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-4xl font-bold tracking-tight font-space-grotesk text-[#1C1917] dark:text-white">
                  $0
                </span>
                <span className="text-sm text-[#78716C] dark:text-[#A8A29E] font-space-grotesk mb-1">
                  / month
                </span>
              </div>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] font-space-grotesk">
                Everything you need to get started.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f) => (
                <FeatureRow key={f.label} {...f} />
              ))}
            </ul>

            <Link
              href="/signup"
              className="w-full text-center h-11 px-6 rounded-full text-sm font-semibold font-space-grotesk border border-[#D1CDC7] dark:border-[#44403C] text-[#1C1917] dark:text-white hover:bg-[#F5F2E8] dark:hover:bg-[#292524] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-center justify-center"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro card */}
          <div className="relative bg-white dark:bg-[#1C1917] border-2 border-accent/40 rounded-2xl p-6 sm:p-8 flex flex-col shadow-[0_0_0_1px_rgba(217,119,87,0.15),0_8px_32px_-8px_rgba(217,119,87,0.2)]">
            {/* Most popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white text-[10px] font-bold font-space-grotesk shadow-lg shadow-accent/20">
                <Icon icon="solar:crown-linear" width={10} height={10} aria-hidden />
                Most Popular
              </div>
            </div>

            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-wider font-bold text-accent font-space-grotesk mb-2">
                Pro
              </p>
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-4xl font-bold tracking-tight font-space-grotesk text-[#1C1917] dark:text-white">
                  {proPrice}
                </span>
                <span className="text-sm text-[#78716C] dark:text-[#A8A29E] font-space-grotesk mb-1">
                  {proBillingLabel}
                </span>
              </div>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] font-space-grotesk">
                14-day free trial · no credit card required
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map((f) => (
                <FeatureRow key={f.label} {...f} />
              ))}
            </ul>

            <Link
              href="/signup"
              className="w-full text-center h-11 px-6 rounded-full text-sm font-semibold font-space-grotesk bg-accent hover:bg-accent-hover text-white transition-colors shadow-lg shadow-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D] flex items-center justify-center"
            >
              Start 14-Day Free Trial
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#78716C] dark:text-[#A8A29E] font-space-grotesk">
          No credit card required for the free plan. Pro trial requires a card. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
