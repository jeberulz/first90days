"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import { KB_CATEGORIES } from "@/lib/kbCategories";

export default function AddKnowledgeModal({ open, onClose, defaultCategory }) {
  const createDocument = useMutation(api.kb.createDocument);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(defaultCategory || "goals_notes");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await createDocument({
        title: title.trim(),
        content,
        category,
        sourceType: "manual",
      });
      setTitle("");
      setContent("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end lg:items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1C1917] border border-[#2C2825] rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-instrument-serif text-2xl text-white tracking-[-0.4px]">
              Add to Knowledge Base
            </h3>
            <p className="text-xs text-[#A8A29E] mt-1">
              Embedding + AI enrichment runs in the background. The brain learns from this entry within ~30 seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A8A29E] hover:text-white p-1"
          >
            <Icon icon="solar:close-circle-linear" width={22} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-white placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
            placeholder="e.g. Marcus — communication preferences"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-white placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
            rows={10}
            placeholder="Paste a doc, write notes, or describe context the AI brain should know about."
            required
          />
          <p className="text-[10px] text-[#A8A29E]">
            Tip: Entries shorter than 200 characters skip enrichment. Aim for at least a paragraph for the best AI memory extraction.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#D97757]"
          >
            {KB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-space-grotesk text-sm text-[#A8A29E] hover:bg-[#292524] rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#D97757] hover:bg-[#C26242] disabled:opacity-50 text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              "Save & enrich"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
