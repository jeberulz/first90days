"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";

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
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
            Stakeholders
          </h1>
          <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
            {stakeholders.length} people in your network
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition shadow-sm"
        >
          Add stakeholder
        </button>
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        {["priority", "health", "name"].map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded-lg font-space-grotesk text-xs capitalize transition ${
              sortBy === s
                ? "bg-[#292524] text-[#E7E5E4] border border-[#44403C]"
                : "text-[#A8A29E] hover:text-[#E7E5E4]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {sorted.map((s) => (
          <Link
            key={s._id}
            href={`/stakeholders/${s._id}`}
            className="block bg-[#1C1917] border border-[#2C2825] rounded-xl p-5 hover:border-[#44403C] transition"
          >
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center">
                  <span className="text-white text-sm font-medium font-space-grotesk">
                    {s.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1C1917] ${healthColors[s.health]}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-space-grotesk text-base font-medium text-[#E7E5E4]">
                  {s.name}
                </p>
                <p className="font-space-grotesk text-sm text-[#A8A29E]">
                  {s.role}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
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

      {/* Add stakeholder modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-[#1C1917] border border-[#2C2825] rounded-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="font-instrument-serif text-xl text-[#E7E5E4]">
              Add Stakeholder
            </h3>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                placeholder="Full name"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Role</label>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                placeholder="e.g. VP of Product"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Type</label>
                <select
                  value={form.relationshipType}
                  onChange={(e) => setForm({ ...form, relationshipType: e.target.value })}
                  className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                >
                  <option>Champion</option>
                  <option>Decider</option>
                  <option>Inform</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                >
                  <option>Must</option>
                  <option>Should</option>
                  <option>Could</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 font-space-grotesk text-sm text-[#A8A29E] hover:bg-[#292524] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
