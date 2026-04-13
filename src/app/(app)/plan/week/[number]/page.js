"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { use, useState } from "react";
import Link from "next/link";

const categoryColors = {
  learning: { border: "border-l-blue-500", text: "text-blue-400", bg: "bg-blue-500/10" },
  shipping: { border: "border-l-green-500", text: "text-green-400", bg: "bg-green-500/10" },
  relationships: { border: "border-l-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" },
  influence: { border: "border-l-purple-500", text: "text-purple-400", bg: "bg-purple-500/10" },
};

const inputClass =
  "w-full bg-[#0F0E0D] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-2 focus:ring-[#D97757]/30";

export default function WeekDetailPage({ params }) {
  const { number } = use(params);
  const weekNumber = parseInt(number, 10);
  const activities = useQuery(api.activities.getByWeek, { weekNumber });
  const weeks = useQuery(api.plans.getWeeks);
  const completeActivity = useMutation(api.activities.complete);
  const skipActivity = useMutation(api.activities.skip);
  const removeActivity = useMutation(api.activities.remove);
  const updateActivity = useMutation(api.activities.update);
  const createActivity = useMutation(api.activities.create);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(/** @type {null | Record<string, unknown>} */ (null));
  const [addOpen, setAddOpen] = useState(false);
  const firstDayOfWeek = (weekNumber - 1) * 7 + 1;
  const [newForm, setNewForm] = useState({
    title: "",
    description: "",
    category: "learning",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: firstDayOfWeek,
  });

  const week = weeks?.find((w) => w.number === weekNumber);

  function startEdit(activity) {
    setEditingId(activity._id);
    setDraft({
      title: activity.title,
      description: activity.description,
      category: activity.category,
      estimatedTime: activity.estimatedTime,
      priority: activity.priority,
      scheduledDay: activity.scheduledDay ?? firstDayOfWeek,
    });
  }

  async function saveEdit(activityId) {
    if (!draft) return;
    await updateActivity({
      id: activityId,
      title: String(draft.title),
      description: String(draft.description),
      category: String(draft.category),
      estimatedTime: String(draft.estimatedTime),
      priority: String(draft.priority),
      scheduledDay: Number(draft.scheduledDay),
    });
    setEditingId(null);
    setDraft(null);
  }

  async function submitNew() {
    if (!newForm.title.trim()) return;
    await createActivity({
      title: newForm.title.trim(),
      description: newForm.description.trim() || "—",
      category: newForm.category,
      estimatedTime: newForm.estimatedTime,
      priority: newForm.priority,
      weekNumber,
      scheduledDay: Number(newForm.scheduledDay),
    });
    setNewForm({
      title: "",
      description: "",
      category: "learning",
      estimatedTime: "1h",
      priority: "Medium",
      scheduledDay: firstDayOfWeek,
    });
    setAddOpen(false);
  }

  if (!activities || !weeks) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#1C1917] rounded-lg animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const byDay = {};
  for (const a of activities) {
    const day = a.scheduledDay || 0;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(a);
  }
  const sortedDays = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);

  const completed = activities.filter((a) => a.status === "completed").length;
  const total = activities.length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <Link
          href="/plan"
          className="font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] transition mb-3 sm:mb-4 inline-block"
        >
          ← Back to plan
        </Link>
        <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight">
          Week {weekNumber}: {week?.theme || ""}
        </h1>
        <p className="mt-2 font-space-grotesk text-sm sm:text-base text-[#A8A29E]">
          {completed} of {total} activities completed · Pre-seeded tasks are fully editable
        </p>
        {total > 0 && (
          <div className="mt-3 w-full max-w-xs h-1.5 bg-[#292524] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D97757] rounded-full transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {week?.reflectionPrompt && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5">
          <p className="font-space-grotesk text-xs font-medium text-[#A8A29E] mb-1">
            Reflection Prompt
          </p>
          <p className="font-instrument-serif text-lg text-[#E7E5E4]">
            {week.reflectionPrompt}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="font-space-grotesk text-sm px-4 py-2 rounded-lg bg-[#D97757] text-white hover:bg-[#C26242] transition"
        >
          {addOpen ? "Close add form" : "+ Add activity this week"}
        </button>
      </div>

      {addOpen && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5 space-y-3">
          <p className="font-space-grotesk text-xs font-medium text-[#A8A29E] uppercase tracking-wide">
            New activity
          </p>
          <input
            className={inputClass}
            placeholder="Title"
            value={newForm.title}
            onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
          />
          <textarea
            className={`${inputClass} min-h-[72px]`}
            placeholder="Description"
            value={newForm.description}
            onChange={(e) =>
              setNewForm({ ...newForm, description: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className={inputClass}
              value={newForm.category}
              onChange={(e) =>
                setNewForm({ ...newForm, category: e.target.value })
              }
            >
              {["learning", "shipping", "relationships", "influence"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={newForm.priority}
              onChange={(e) =>
                setNewForm({ ...newForm, priority: e.target.value })
              }
            >
              {["High", "Medium", "Low"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputClass}
              placeholder="e.g. 1h"
              value={newForm.estimatedTime}
              onChange={(e) =>
                setNewForm({ ...newForm, estimatedTime: e.target.value })
              }
            />
            <input
              type="number"
              min={1}
              max={90}
              className={inputClass}
              title="Plan day (1–90)"
              value={newForm.scheduledDay}
              onChange={(e) =>
                setNewForm({
                  ...newForm,
                  scheduledDay: parseInt(e.target.value, 10) || 1,
                })
              }
            />
          </div>
          <button
            type="button"
            onClick={() => submitNew()}
            className="font-space-grotesk text-sm px-4 py-2 rounded-lg border border-[#44403C] text-[#E7E5E4] hover:bg-[#292524] transition"
          >
            Save activity
          </button>
        </div>
      )}

      <div className="space-y-6">
        {sortedDays.map((day) => (
          <div key={day}>
            <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
              Day {day}
            </h3>
            <div className="space-y-2">
              {byDay[day].map((activity) => {
                const colors =
                  categoryColors[activity.category] || categoryColors.learning;
                const isDone = activity.status === "completed";
                const isSkipped = activity.status === "skipped";
                const isEditing = editingId === activity._id;

                return (
                  <div
                    key={activity._id}
                    className={`bg-[#1C1917] border border-[#2C2825] rounded-xl p-4 border-l-4 ${colors.border} ${
                      isDone || isSkipped ? "opacity-70" : ""
                    }`}
                  >
                    {isEditing && draft ? (
                      <div className="space-y-3">
                        <input
                          className={inputClass}
                          value={String(draft.title)}
                          onChange={(e) =>
                            setDraft({ ...draft, title: e.target.value })
                          }
                        />
                        <textarea
                          className={`${inputClass} min-h-[64px]`}
                          value={String(draft.description)}
                          onChange={(e) =>
                            setDraft({ ...draft, description: e.target.value })
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className={inputClass}
                            value={String(draft.category)}
                            onChange={(e) =>
                              setDraft({ ...draft, category: e.target.value })
                            }
                          >
                            {["learning", "shipping", "relationships", "influence"].map(
                              (c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              )
                            )}
                          </select>
                          <select
                            className={inputClass}
                            value={String(draft.priority)}
                            onChange={(e) =>
                              setDraft({ ...draft, priority: e.target.value })
                            }
                          >
                            {["High", "Medium", "Low"].map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className={inputClass}
                            placeholder="Time e.g. 1h"
                            value={String(draft.estimatedTime)}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                estimatedTime: e.target.value,
                              })
                            }
                          />
                          <input
                            type="number"
                            min={1}
                            max={90}
                            className={inputClass}
                            title="Plan day 1–90"
                            value={Number(draft.scheduledDay)}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                scheduledDay: parseInt(e.target.value, 10) || 1,
                              })
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(activity._id)}
                            className="font-space-grotesk text-xs px-3 py-1.5 rounded-lg bg-[#D97757] text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setDraft(null);
                            }}
                            className="font-space-grotesk text-xs px-3 py-1.5 rounded-lg border border-[#44403C] text-[#A8A29E]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {!isDone && !isSkipped && (
                          <button
                            type="button"
                            onClick={() =>
                              completeActivity({ id: activity._id })
                            }
                            className="mt-0.5 w-5 h-5 rounded border-2 border-[#44403C] hover:border-[#D97757] transition-colors flex-shrink-0"
                          />
                        )}
                        {isDone && (
                          <div className="mt-0.5 w-5 h-5 rounded bg-[#D97757] flex items-center justify-center flex-shrink-0">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          </div>
                        )}
                        {isSkipped && (
                          <div className="mt-0.5 w-5 h-5 rounded bg-[#292524] flex items-center justify-center flex-shrink-0">
                            <span className="text-[#A8A29E] text-xs">—</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-space-grotesk text-sm font-medium ${
                              isDone
                                ? "text-[#A8A29E] line-through"
                                : "text-[#E7E5E4]"
                            }`}
                          >
                            {activity.title}
                          </p>
                          <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E] line-clamp-2">
                            {activity.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span
                              className={`font-space-grotesk text-xs ${colors.text}`}
                            >
                              {activity.category}
                            </span>
                            <span className="font-space-grotesk text-xs text-[#A8A29E]">
                              {activity.estimatedTime}
                            </span>
                            <span className="font-space-grotesk text-xs text-[#A8A29E]">
                              {activity.priority}
                            </span>
                            {activity.source === "seed" && (
                              <span className="font-space-grotesk text-[10px] uppercase tracking-wide text-[#78716C]">
                                Seed · editable
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(activity)}
                            className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#292524] transition-colors text-xs font-space-grotesk"
                            title="Edit"
                          >
                            Edit
                          </button>
                          {!isDone && !isSkipped && (
                            <button
                              type="button"
                              onClick={() => skipActivity({ id: activity._id })}
                              className="p-1.5 rounded-md text-[#A8A29E] hover:text-[#E7E5E4] hover:bg-[#292524] transition-colors"
                              title="Skip"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 14 14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path d="M4 2l6 5-6 5V2z" />
                                <line x1="11" y1="2" x2="11" y2="12" />
                              </svg>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeActivity({ id: activity._id })}
                            className="p-1.5 rounded-md text-[#A8A29E] hover:text-red-400 hover:bg-[#292524] transition-colors"
                            title="Delete"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <line x1="2" y1="2" x2="10" y2="10" />
                              <line x1="10" y1="2" x2="2" y2="10" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
          <p className="font-instrument-serif text-xl text-[#E7E5E4]">
            No activities for this week
          </p>
          <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E]">
            Use the form above or Quick Add to add tasks.
          </p>
        </div>
      )}
    </div>
  );
}
