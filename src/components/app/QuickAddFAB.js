"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'activity' | 'win' | 'learning'
  const dayInfo = useQuery(api.users.getDayNumber);
  const createActivity = useMutation(api.activities.create);
  const createLogEntry = useMutation(api.logEntries.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("learning");
  const [loading, setLoading] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setCategory("learning");
    setMode(null);
    setOpen(false);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    try {
      if (mode === "activity") {
        await createActivity({
          title,
          description,
          category,
          estimatedTime: "30m",
          priority: "Medium",
          scheduledDate: new Date().toISOString().split("T")[0],
          weekNumber: dayInfo?.weekNumber || 1,
        });
      } else {
        await createLogEntry({
          type: mode === "win" ? "win" : "learning",
          title,
          description,
          date: new Date().toISOString().split("T")[0],
          category,
        });
      }
      reset();
    } catch {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 lg:bottom-8 right-6 w-14 h-14 bg-[#D97757] hover:bg-[#C26242] text-white rounded-full shadow-lg flex items-center justify-center transition-transform z-50"
        style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Menu */}
      {open && !mode && (
        <div className="fixed bottom-40 lg:bottom-24 right-6 bg-[#1C1917] border border-[#2C2825] rounded-xl shadow-xl z-50 w-56 overflow-hidden">
          {[
            { key: "activity", label: "Add Activity", icon: "📋" },
            { key: "win", label: "Log a Win", icon: "🏆" },
            { key: "learning", label: "Log a Learning", icon: "💡" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setMode(item.key)}
              className="w-full flex items-center gap-3 px-4 py-3 font-space-grotesk text-sm text-[#E7E5E4] hover:bg-[#292524] transition-colors text-left"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={reset}
        />
      )}

      {/* Form modal */}
      {mode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-[#1C1917] border border-[#2C2825] rounded-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="font-instrument-serif text-xl text-[#E7E5E4]">
              {mode === "activity"
                ? "Add Activity"
                : mode === "win"
                  ? "Log a Win"
                  : "Log a Learning"}
            </h3>

            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                placeholder={
                  mode === "activity"
                    ? "e.g. Meet with design team"
                    : mode === "win"
                      ? "e.g. Got positive feedback from VP"
                      : "e.g. Learned about team dynamics"
                }
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                rows={2}
                placeholder="Optional details..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">
                Category
              </label>
              <div className="flex gap-2 flex-wrap">
                {["learning", "shipping", "relationships", "influence"].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-md font-space-grotesk text-xs capitalize transition ${
                        category === cat
                          ? "bg-[#D97757] text-white"
                          : "bg-[#292524] text-[#A8A29E] border border-[#44403C]"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 font-space-grotesk text-sm text-[#A8A29E] hover:bg-[#292524] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
