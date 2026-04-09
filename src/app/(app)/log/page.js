"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";

const typeConfig = {
  win: { label: "Wins", emoji: "🏆", color: "text-green-400" },
  learning: { label: "Learnings", emoji: "💡", color: "text-blue-400" },
  mistake: { label: "Mistakes", emoji: "📝", color: "text-amber-400" },
};

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
      date: new Date().toISOString().split("T")[0],
    });
    setForm({ type: "win", title: "", description: "", category: "learning" });
    setShowForm(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
            Wins & Learnings
          </h1>
          <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
            {entries.length} entries logged
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition shadow-sm"
        >
          Add entry
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "All" },
          { key: "win", label: "🏆 Wins" },
          { key: "learning", label: "💡 Learnings" },
          { key: "mistake", label: "📝 Mistakes" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg font-space-grotesk text-xs transition ${
              activeTab === tab.key
                ? "bg-[#D97757] text-white"
                : "bg-[#1C1917] text-[#A8A29E] border border-[#2C2825] hover:border-[#44403C]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {/* Add entry modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-[#1C1917] border border-[#2C2825] rounded-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="font-instrument-serif text-xl text-[#E7E5E4]">
              Log Entry
            </h3>
            <div className="flex gap-2">
              {Object.entries(typeConfig).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, type: key })}
                  className={`flex-1 px-3 py-2 rounded-lg font-space-grotesk text-xs text-center transition ${
                    form.type === key
                      ? "bg-[#D97757] text-white"
                      : "bg-[#292524] text-[#A8A29E] border border-[#44403C]"
                  }`}
                >
                  {config.emoji} {config.label.slice(0, -1)}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                placeholder="What happened?"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Details</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                rows={2}
                placeholder="Optional details..."
              />
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
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
