"use client";

import { Icon } from "@iconify/react";

export default function GoalCard({ icon, label, description, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3.5 w-full p-4 rounded-xl border text-left transition-all duration-200 group ${
        selected
          ? "border-accent bg-accent/[0.06]"
          : "border-warm-line bg-white hover:border-warm-border"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          selected ? "bg-accent border-accent" : "border-warm-border"
        }`}
      >
        <svg
          aria-hidden="true"
          className={`w-3 h-3 text-white transition-opacity ${selected ? "opacity-100" : "opacity-0"}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-warm-ink">{label}</span>
        <p className="text-xs text-warm-300 mt-0.5">{description}</p>
      </div>
      <Icon
        icon={icon}
        width={18}
        className={`shrink-0 transition-colors ${selected ? "text-accent" : "text-warm-border group-hover:text-accent"}`}
      />
    </button>
  );
}
