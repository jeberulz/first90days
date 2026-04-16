"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { ResponsiveModal, ScrollableTabs } from "@/components/primitives";
import NoPlanEmptyState from "@/components/app/NoPlanEmptyState";
import { useHasPlan } from "@/hooks/useHasPlan";

const SORT_TABS = [
  { key: "priority", label: "Priority" },
  { key: "health", label: "Health" },
  { key: "name", label: "Name" },
];

const healthColors = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-[#44403C]",
};

const typeBadge = {
  Champion: "bg-[#D97757] text-white",
  Decider: "bg-[#D97757]/80 text-white",
  Inform: "bg-[#292524] text-[#A8A29E] border border-[#44403C]",
};

export default function StakeholdersPage() {
  const stakeholders = useQuery(api.stakeholders.list);
  const viewer = useQuery(api.users.viewer);
  const { hasPlan, isGenerating } = useHasPlan();
  const createStakeholder = useMutation(api.stakeholders.create);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    relationshipType: "Inform",
    priority: "Should",
  });
  const [sortBy, setSortBy] = useState("priority");

  if (!stakeholders) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const priorityOrder = { Must: 0, Should: 1, Could: 2 };
  const sorted = [...stakeholders].sort((a, b) => {
    if (sortBy === "priority") {
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    }
    if (sortBy === "health") {
      const healthOrder = { red: 0, yellow: 1, none: 2, green: 3 };
      return (healthOrder[a.health] || 4) - (healthOrder[b.health] || 4);
    }
    return a.name.localeCompare(b.name);
  });

  async function handleCreate(e) {
    e.preventDefault();
    await createStakeholder(form);
    setForm({ name: "", role: "", relationshipType: "Inform", priority: "Should" });
    setShowForm(false);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Stakeholders
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            {stakeholders.length} people in your network
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent hover:bg-accent-hover text-white rounded-lg px-3 sm:px-4 py-2 font-space-grotesk text-sm font-medium transition shadow-sm shrink-0 min-h-11"
        >
          <span className="hidden sm:inline">Add stakeholder</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {stakeholders.length === 0 ? (
        isGenerating ? (
          <div className="bg-[#1C1917] border border-[#D97757]/30 rounded-xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-[#D97757] border-t-transparent rounded-full animate-spin" />
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              Your plan is being generated. Stakeholders will appear here shortly.
            </p>
          </div>
        ) : hasPlan ? (
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 sm:p-8 text-center space-y-4">
            <h2 className="font-instrument-serif text-2xl text-[#E7E5E4]">No stakeholders yet</h2>
            <p className="font-space-grotesk text-sm text-[#A8A29E] max-w-md mx-auto">
              Map out the key people you need to build relationships with. Click &ldquo;Add stakeholder&rdquo; above to get started.
            </p>
          </div>
        ) : (
          <NoPlanEmptyState
            heading="Build your network"
            description="Map out the key people you need to build relationships with. You can add stakeholders now, or complete onboarding to get AI-suggested contacts based on your role."
            lastOnboardingStep={viewer?.lastOnboardingStep}
            companyName={viewer?.partialOnboarding?.companyName}
          />
        )
      ) : (
      <>
      {/* Sort */}
      <ScrollableTabs
        items={SORT_TABS}
        activeKey={sortBy}
        onChange={setSortBy}
        ariaLabel="Sort by"
      />

      {/* List */}
      <div className="space-y-3">
        {sorted.map((s) => (
          <Link
            key={s._id}
            href={`/stakeholders/${s._id}`}
            className="block bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 sm:p-5 hover:border-[#44403C] transition"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center">
                  <span className="text-white text-sm font-medium font-space-grotesk">
                    {s.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1C1917] ${healthColors[s.health]}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-space-grotesk text-sm sm:text-base font-medium text-[#E7E5E4] truncate">
                  {s.name}
                </p>
                <p className="font-space-grotesk text-xs sm:text-sm text-[#A8A29E] truncate">
                  {s.role}
                </p>
                <div className="flex items-center gap-2 mt-1.5 sm:hidden">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium font-space-grotesk ${
                      typeBadge[s.relationshipType] || typeBadge.Inform
                    }`}
                  >
                    {s.relationshipType}
                  </span>
                  <span className="font-space-grotesk text-[10px] text-[#A8A29E]">
                    {s.priority}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium font-space-grotesk ${
                    typeBadge[s.relationshipType] || typeBadge.Inform
                  }`}
                >
                  {s.relationshipType}
                </span>
                <span className="font-space-grotesk text-xs text-[#A8A29E]">
                  {s.priority}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      </>
      )}

      <ResponsiveModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Stakeholder"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 font-space-grotesk text-sm text-warm-300 hover:bg-warm-surfaceDark rounded-lg transition min-h-11"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="stakeholder-form"
              className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition min-h-11"
            >
              Add
            </button>
          </div>
        }
      >
        <form id="stakeholder-form" onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="sk-name" className="font-space-grotesk text-xs font-medium text-warm-300">Name</label>
            <input
              id="sk-name"
              data-autofocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sk-role" className="font-space-grotesk text-xs font-medium text-warm-300">Role</label>
            <input
              id="sk-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="e.g. VP of Product"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="sk-type" className="font-space-grotesk text-xs font-medium text-warm-300">Type</label>
              <select
                id="sk-type"
                value={form.relationshipType}
                onChange={(e) => setForm({ ...form, relationshipType: e.target.value })}
                className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option>Champion</option>
                <option>Decider</option>
                <option>Inform</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sk-priority" className="font-space-grotesk text-xs font-medium text-warm-300">Priority</label>
              <select
                id="sk-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option>Must</option>
                <option>Should</option>
                <option>Could</option>
              </select>
            </div>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
}
