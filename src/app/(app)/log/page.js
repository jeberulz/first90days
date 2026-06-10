"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { ResponsiveModal, ScrollableTabs } from "@/components/primitives";
import { localDateYMD } from "@/lib/dates";

const typeConfig = {
  win: { label: "Wins", emoji: "🏆", color: "text-green-400" },
  learning: { label: "Learnings", emoji: "💡", color: "text-blue-400" },
  mistake: { label: "Mistakes", emoji: "📝", color: "text-amber-400" },
};

const TAB_ITEMS = [
  { key: "all", label: "All" },
  { key: "win", label: "🏆 Wins" },
  { key: "learning", label: "💡 Learnings" },
  { key: "mistake", label: "📝 Mistakes" },
];

export default function LogPage() {
  const allEntries = useQuery(api.logEntries.list, {});
  const createEntry = useMutation(api.logEntries.create);
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "win",
    title: "",
    description: "",
    category: "learning",
  });

  const entries = allEntries || [];
  const filtered =
    activeTab === "all"
      ? entries
      : entries.filter((e) => e.type === activeTab);

  const sortedEntries = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  async function handleCreate(e) {
    e.preventDefault();
    await createEntry({
      ...form,
      date: localDateYMD(),
    });
    setForm({ type: "win", title: "", description: "", category: "learning" });
    setShowForm(false);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
            Wins & Learnings
          </h1>
          <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
            {entries.length} entries logged
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent hover:bg-accent-hover text-white rounded-lg px-3 sm:px-4 py-2 font-space-grotesk text-sm font-medium transition shadow-sm shrink-0 min-h-11"
        >
          Add entry
        </button>
      </div>

      {/* Tabs */}
      <ScrollableTabs
        items={TAB_ITEMS}
        activeKey={activeTab}
        onChange={setActiveTab}
        ariaLabel="Filter entries by type"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(typeConfig).map(([key, config]) => {
          const count = entries.filter((e) => e.type === key).length;
          return (
            <div key={key} className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-4">
              <p className="font-space-grotesk text-xs text-[#A8A29E]">{config.label}</p>
              <p className={`font-instrument-serif text-2xl ${config.color}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Entries */}
      <div className="space-y-3">
        {sortedEntries.length === 0 && (
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              No entries yet. Start logging your wins and learnings.
            </p>
          </div>
        )}
        {sortedEntries.map((entry) => {
          const config = typeConfig[entry.type] || typeConfig.learning;
          return (
            <div
              key={entry._id}
              className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{config.emoji}</span>
                <div className="flex-1">
                  <p className="font-space-grotesk text-sm font-medium text-[#E7E5E4]">
                    {entry.title}
                  </p>
                  {entry.description && (
                    <p className="mt-1 font-space-grotesk text-sm text-[#A8A29E]">
                      {entry.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`font-space-grotesk text-xs ${config.color}`}>
                      {config.label.slice(0, -1)}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#57534E]">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#57534E] capitalize">
                      {entry.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ResponsiveModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Log Entry"
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
              form="log-entry-form"
              className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition min-h-11"
            >
              Save
            </button>
          </div>
        }
      >
        <form id="log-entry-form" onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-2">
            {Object.entries(typeConfig).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, type: key })}
                className={`flex-1 px-3 py-2 rounded-lg font-space-grotesk text-xs text-center transition min-h-10 ${
                  form.type === key
                    ? "bg-accent text-white"
                    : "bg-warm-surfaceDark text-warm-300 border border-warm-borderMuted"
                }`}
              >
                {config.emoji} {config.label.slice(0, -1)}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="log-title"
              className="font-space-grotesk text-xs font-medium text-warm-300"
            >
              Title
            </label>
            <input
              id="log-title"
              data-autofocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="What happened?"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="log-details"
              className="font-space-grotesk text-xs font-medium text-warm-300"
            >
              Details
            </label>
            <textarea
              id="log-details"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              rows={3}
              placeholder="Optional details..."
            />
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
}
