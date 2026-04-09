"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { use, useState } from "react";
import Link from "next/link";

export default function StakeholderDetailPage({ params }) {
  const { id } = use(params);
  const stakeholder = useQuery(api.stakeholders.get, { id });
  const updateStakeholder = useMutation(api.stakeholders.update);
  const addInteraction = useMutation(api.stakeholders.addInteraction);

  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [interaction, setInteraction] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "1:1 Meeting",
    title: "",
    notes: "",
  });
  const [showEditBg, setShowEditBg] = useState(false);
  const [bgText, setBgText] = useState("");

  if (!stakeholder) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-[#1C1917] rounded-lg animate-pulse w-1/3" />
        <div className="h-40 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
      </div>
    );
  }

  async function handleAddInteraction(e) {
    e.preventDefault();
    await addInteraction({
      stakeholderId: id,
      ...interaction,
    });
    setInteraction({ date: new Date().toISOString().split("T")[0], type: "1:1 Meeting", title: "", notes: "" });
    setShowInteractionForm(false);
  }

  async function handleToggleActionItem(interactionIdx, actionIdx) {
    const inter = stakeholder.interactions[interactionIdx];
    if (!inter.actionItems) return;
    const updated = inter.actionItems.map((item, i) =>
      i === actionIdx ? { ...item, completed: !item.completed } : item
    );
    // Action items live on interactions - we'd need an update interaction mutation
    // For now this is a UI-only feature tracked in the interaction
  }

  const typeBadge = {
    Champion: "bg-[#D97757] text-white",
    Decider: "bg-[#D97757]/80 text-white",
    Inform: "bg-[#292524] text-[#A8A29E] border border-[#44403C]",
  };

  return (
    <div className="space-y-8">
      <Link
        href="/stakeholders"
        className="font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] transition inline-block"
      >
        ← Back to stakeholders
      </Link>

      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-medium font-space-grotesk">
            {stakeholder.name.split(" ").map((n) => n[0]).join("")}
          </span>
        </div>
        <div className="flex-1">
          <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
            {stakeholder.name}
          </h1>
          <p className="mt-1 font-space-grotesk text-base text-[#A8A29E]">
            {stakeholder.role}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium font-space-grotesk ${
                typeBadge[stakeholder.relationshipType] || typeBadge.Inform
              }`}
            >
              {stakeholder.relationshipType}
            </span>
            <span className="font-space-grotesk text-xs text-[#A8A29E]">
              {stakeholder.priority} priority
            </span>
            {stakeholder.stance && (
              <span className="font-space-grotesk text-xs text-[#A8A29E]">
                · {stakeholder.stance}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowInteractionForm(true)}
          className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition shadow-sm flex-shrink-0"
        >
          Schedule Check-in
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Background */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
                Background & Context
              </h3>
              <button
                onClick={() => {
                  setShowEditBg(true);
                  setBgText(stakeholder.backgroundContext || "");
                }}
                className="font-space-grotesk text-xs text-[#D97757] hover:text-[#C26242] transition"
              >
                Edit
              </button>
            </div>
            {showEditBg ? (
              <div className="space-y-2">
                <textarea
                  value={bgText}
                  onChange={(e) => setBgText(e.target.value)}
                  className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowEditBg(false)} className="px-3 py-1.5 font-space-grotesk text-xs text-[#A8A29E]">Cancel</button>
                  <button
                    onClick={async () => {
                      await updateStakeholder({ id, backgroundContext: bgText });
                      setShowEditBg(false);
                    }}
                    className="bg-[#D97757] text-white rounded-md px-3 py-1.5 font-space-grotesk text-xs font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-space-grotesk text-sm text-[#E7E5E4] leading-relaxed">
                {stakeholder.backgroundContext || "No background notes yet."}
              </p>
            )}
          </div>

          {/* Interaction history */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
                Meeting Notes
              </h3>
              <button
                onClick={() => setShowInteractionForm(true)}
                className="font-space-grotesk text-xs text-[#D97757] hover:text-[#C26242] transition"
              >
                + Add interaction
              </button>
            </div>
            {stakeholder.interactions.length === 0 ? (
              <p className="font-space-grotesk text-sm text-[#57534E]">
                No interactions logged yet. Schedule your first meeting.
              </p>
            ) : (
              <div className="space-y-4">
                {stakeholder.interactions.map((inter, idx) => (
                  <div key={inter._id} className="border-l-2 border-[#2C2825] pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-space-grotesk text-xs text-[#A8A29E]">
                        {new Date(inter.date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                      <span className="font-space-grotesk text-xs text-[#57534E]">
                        {inter.type}
                      </span>
                    </div>
                    {inter.title && (
                      <p className="font-space-grotesk text-sm font-medium text-[#E7E5E4] mb-1">
                        {inter.title}
                      </p>
                    )}
                    <p className="font-space-grotesk text-sm text-[#A8A29E] leading-relaxed">
                      {inter.notes}
                    </p>
                    {inter.actionItems && inter.actionItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {inter.actionItems.map((item, ai) => (
                          <div key={ai} className="flex items-center gap-2">
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                item.completed
                                  ? "bg-[#D97757] border-[#D97757]"
                                  : "border-[#44403C]"
                              }`}
                            >
                              {item.completed && (
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5">
                                  <path d="M1 4l2 2 4-4" />
                                </svg>
                              )}
                            </div>
                            <span
                              className={`font-space-grotesk text-xs ${
                                item.completed ? "text-[#57534E] line-through" : "text-[#A8A29E]"
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Relationship mapping */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
            <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-4">
              Relationship Mapping
            </h3>
            {["influenceLevel", "interestLevel"].map((field) => {
              const val = stakeholder[field];
              const levels = { Low: 1, Medium: 2, High: 3 };
              const level = levels[val] || 0;
              return (
                <div key={field} className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-space-grotesk text-xs text-[#A8A29E]">
                      {field === "influenceLevel" ? "Influence" : "Interest"}
                    </span>
                    <span className="font-space-grotesk text-xs text-[#E7E5E4]">
                      {val || "Not set"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((l) => (
                      <div
                        key={l}
                        className={`flex-1 h-2 rounded-full ${
                          l <= level ? "bg-[#D97757]" : "bg-[#292524]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Working preferences */}
          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
            <h3 className="font-space-grotesk text-sm font-medium text-[#A8A29E] mb-3">
              Working Preferences
            </h3>
            {stakeholder.workingPreferences &&
            stakeholder.workingPreferences.length > 0 ? (
              <ul className="space-y-2">
                {stakeholder.workingPreferences.map((pref, i) => (
                  <li key={i} className="font-space-grotesk text-sm text-[#E7E5E4] flex items-start gap-2">
                    <span className="text-[#D97757] mt-1">•</span>
                    {pref}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-space-grotesk text-sm text-[#57534E]">
                No preferences noted yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add interaction modal */}
      {showInteractionForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <form
            onSubmit={handleAddInteraction}
            className="bg-[#1C1917] border border-[#2C2825] rounded-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="font-instrument-serif text-xl text-[#E7E5E4]">
              Log Interaction
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Date</label>
                <input
                  type="date"
                  value={interaction.date}
                  onChange={(e) => setInteraction({ ...interaction, date: e.target.value })}
                  className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Type</label>
                <select
                  value={interaction.type}
                  onChange={(e) => setInteraction({ ...interaction, type: e.target.value })}
                  className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                >
                  <option>1:1 Meeting</option>
                  <option>Group Meeting</option>
                  <option>Coffee Chat</option>
                  <option>Email</option>
                  <option>Slack</option>
                  <option>Presentation</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Title (optional)</label>
              <input
                value={interaction.title}
                onChange={(e) => setInteraction({ ...interaction, title: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                placeholder="e.g. Quarterly alignment discussion"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Notes</label>
              <textarea
                value={interaction.notes}
                onChange={(e) => setInteraction({ ...interaction, notes: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                rows={3}
                placeholder="Key topics discussed, decisions made..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInteractionForm(false)}
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
