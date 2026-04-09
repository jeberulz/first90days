"use client";

import { Icon } from "@iconify/react";

export default function RoleCard({ icon, label, description, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 group ${
        selected
          ? "border-accent bg-accent/[0.06]"
          : "border-warm-line bg-white hover:border-warm-border"
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
          selected ? "bg-accent border-accent" : "border-warm-border"
        }`}
      >
        <svg
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
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon
            icon={icon}
            width={16}
            className={`transition-colors ${selected ? "text-accent" : "text-warm-300 group-hover:text-accent"}`}
          />
          <span className="text-sm font-medium text-warm-ink">{label}</span>
        </div>
        <p className="text-xs text-warm-300 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
