"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ResponsiveModal } from "@/components/primitives";
import { useHasPlan } from "@/hooks/useHasPlan";

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'activity' | 'win' | 'learning'
  const dayInfo = useQuery(api.users.getDayNumber);
  const { hasPlan, isLoading: planLoading } = useHasPlan();
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

  function closeModalOnly() {
    setMode(null);
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

  const titleFor = {
    activity: "Add Activity",
    win: "Log a Win",
    learning: "Log a Learning",
  };

  return (
    <>
      {/* FAB button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Quick add"
        className="fixed right-[max(1.25rem,env(safe-area-inset-right))] z-[55] w-14 h-14 bg-accent hover:bg-accent-hover text-white rounded-full shadow-lg flex items-center justify-center transition-transform bottom-[calc(var(--bottom-nav-h)+var(--fab-gap))] lg:bottom-[max(2rem,env(safe-area-inset-bottom))]"
        style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Menu */}
      {open && !mode && (
        <div className="fixed right-[max(1.25rem,env(safe-area-inset-right))] z-[55] bg-warm-cardDark border border-warm-borderDark rounded-xl shadow-xl w-56 overflow-hidden bottom-[calc(var(--bottom-nav-h)+5rem)] lg:bottom-[calc(2rem+4.5rem)]">
          {[
            { key: "activity", label: "Add Activity", icon: "📋", requiresPlan: true },
            { key: "win", label: "Log a Win", icon: "🏆" },
            { key: "learning", label: "Log a Learning", icon: "💡" },
          ].map((item) => {
            const disabled = item.requiresPlan && (!hasPlan || planLoading);
            return (
              <button
                key={item.key}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setMode(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 font-space-grotesk text-sm text-left min-h-11 ${
                  disabled
                    ? "text-warm-500 cursor-not-allowed opacity-50"
                    : "text-warm-line hover:bg-warm-surfaceDark transition-colors"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="flex flex-col">
                  {item.label}
                  {disabled && (
                    <span className="text-[10px] text-warm-500">Requires a plan</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Backdrop for menu */}
      {open && !mode && (
        <div
          className="fixed inset-0 bg-black/40 z-[54]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Form modal */}
      <ResponsiveModal
        open={!!mode}
        onClose={closeModalOnly}
        title={mode ? titleFor[mode] : ""}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModalOnly}
              className="px-4 py-2 font-space-grotesk text-sm text-warm-300 hover:bg-warm-surfaceDark rounded-lg transition min-h-11"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="quickadd-form"
              disabled={loading || !title.trim()}
              className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition disabled:opacity-50 min-h-11"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        }
      >
        <form
          id="quickadd-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="quickadd-title"
              className="font-space-grotesk text-xs font-medium text-warm-300"
            >
              Title
            </label>
            <input
              id="quickadd-title"
              data-autofocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder={
                mode === "activity"
                  ? "e.g. Meet with design team"
                  : mode === "win"
                    ? "e.g. Got positive feedback from VP"
                    : "e.g. Learned about team dynamics"
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="quickadd-desc"
              className="font-space-grotesk text-xs font-medium text-warm-300"
            >
              Description
            </label>
            <textarea
              id="quickadd-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              rows={3}
              placeholder="Optional details..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-space-grotesk text-xs font-medium text-warm-300">
              Category
            </label>
            <div className="flex gap-2 flex-wrap">
              {["learning", "shipping", "relationships", "influence"].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-md font-space-grotesk text-xs capitalize transition min-h-9 ${
                      category === cat
                        ? "bg-accent text-white"
                        : "bg-warm-surfaceDark text-warm-300 border border-warm-borderMuted"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>
        </form>
      </ResponsiveModal>
    </>
  );
}
