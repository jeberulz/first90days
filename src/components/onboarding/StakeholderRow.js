"use client";

import { Icon } from "@iconify/react";

const RELATIONSHIP_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "manager", label: "My manager" },
  { value: "skip", label: "Skip-level" },
  { value: "peer", label: "Peer" },
  { value: "report", label: "Direct report" },
  { value: "cross", label: "Cross-functional" },
  { value: "stakeholder", label: "Key stakeholder" },
];

export default function StakeholderRow({ stakeholder, onChange, onRemove, canRemove }) {
  function update(field, value) {
    onChange({ ...stakeholder, [field]: value });
  }

  return (
    <div className="bg-white border border-warm-line rounded-xl p-4 animate-fade-in-up">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
        <div className="sm:col-span-4">
          <label className="block text-xs text-warm-300 mb-1">Name</label>
          <input
            type="text"
            placeholder="Sarah Jenkins"
            value={stakeholder.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-warm-line bg-paper-muted text-sm text-warm-ink placeholder:text-warm-border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs text-warm-300 mb-1">Title</label>
          <input
            type="text"
            placeholder="VP of Product"
            value={stakeholder.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-warm-line bg-paper-muted text-sm text-warm-ink placeholder:text-warm-border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs text-warm-300 mb-1">Relationship</label>
          <div className="relative">
            <select
              value={stakeholder.relationship}
              onChange={(e) => update("relationship", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-line bg-paper-muted text-sm text-warm-ink appearance-none cursor-pointer pr-8 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            >
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Icon
              icon="solar:alt-arrow-down-linear"
              width={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-300 pointer-events-none"
            />
          </div>
        </div>
        <div className="sm:col-span-2 flex items-end justify-end">
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            className="p-2 rounded-lg text-warm-border hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon icon="solar:trash-bin-minimalistic-linear" width={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
