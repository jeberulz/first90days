"use client";

import { Sparkles, ArrowRight, FileText } from "lucide-react";

export function Hero() {
  return (
    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="max-w-3xl">
        {/* Typography Hero */}
        <h1 className="text-6xl md:text-[5.5rem] leading-[1] mb-8 text-charcoal dark:text-cream-50 animate-fade-up font-serif font-medium tracking-tight">
          Meet your
          <br />
          onboarding partner
        </h1>

        {/* Subhead */}
        <p
          className="text-lg md:text-xl text-charcoal/70 dark:text-cream-200/80 max-w-xl mb-12 leading-relaxed font-light animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          Tackle the ambiguity of a new role with a structured plan. First90
          simplifies complexity into a day-by-day roadmap.
        </p>

        {/* Input Component */}
        <div
          className="bg-white dark:bg-[#252420] p-2 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 max-w-xl w-full flex items-center gap-3 animate-fade-up group focus-within:ring-2 ring-terracotta/20 transition-all"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="pl-4">
            <Sparkles className="w-5 h-5 text-terracotta" />
          </div>
          <input
            type="text"
            placeholder="Generate a plan for a Senior Product Manager..."
            className="flex-1 bg-transparent border-none outline-none text-charcoal dark:text-cream-50 placeholder-neutral-400 h-10 text-sm"
          />
          <button className="bg-terracotta px-5 py-2 rounded-xl text-sm font-medium hover:bg-terracotta-hover transition-colors flex items-center gap-2 text-white shrink-0">
            Generate
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Tags */}
        <div
          className="mt-4 flex gap-3 text-xs text-charcoal/50 dark:text-cream-200/50 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="bg-white/50 dark:bg-white/5 px-2 py-1 rounded-md border border-black/5 dark:border-white/5 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Engineering Manager
          </span>
          <span className="bg-white/50 dark:bg-white/5 px-2 py-1 rounded-md border border-black/5 dark:border-white/5 flex items-center gap-1">
            <FileText className="w-3 h-3" /> VP of Sales
          </span>
        </div>
      </div>
    </div>
  );
}
