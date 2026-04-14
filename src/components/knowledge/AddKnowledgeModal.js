"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { KB_CATEGORIES } from "@/lib/kbCategories";
import { ResponsiveModal } from "@/components/primitives";

export default function AddKnowledgeModal({ open, onClose, defaultCategory }) {
  const createDocument = useMutation(api.kb.createDocument);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(defaultCategory || "goals_notes");
  const [submitting, setSubmitting] = useState(false);

  // Sync the category select with the latest defaultCategory each time the
  // modal is opened. Without this, opening from the "Add Team & People"
  // suggestion CTA after previously opening from the generic Add button
  // would still show the old selection.
  useEffect(() => {
    if (open) {
      setCategory(defaultCategory || "goals_notes");
    }
  }, [open, defaultCategory]);

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
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Add to Knowledge Base"
      size="2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-space-grotesk text-sm text-warm-300 hover:bg-warm-surfaceDark rounded-lg transition min-h-11"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-knowledge-form"
            disabled={submitting}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition flex items-center gap-2 min-h-11"
          >
            {submitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      }
    >
      <form id="add-knowledge-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-warm-300">
          Indexed and ready to ground your plan within about 30 seconds.
        </p>

        <div className="space-y-1.5">
          <label htmlFor="kb-title" className="font-space-grotesk text-xs font-medium text-warm-300">
            Title
          </label>
          <input
            id="kb-title"
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="e.g. Marcus — communication preferences"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kb-content" className="font-space-grotesk text-xs font-medium text-warm-300">
            Content
          </label>
          <textarea
            id="kb-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line placeholder:text-warm-500 resize-y focus:outline-none focus:ring-1 focus:ring-accent min-h-[160px]"
            rows={8}
            placeholder="Paste a doc, write notes, or describe context First90 should know about."
            required
          />
          <p className="text-xs text-warm-300">
            Tip: shorter than a paragraph and we'll skip extracting structured insights. A few sentences is enough.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="kb-category" className="font-space-grotesk text-xs font-medium text-warm-300">
            Category
          </label>
          <select
            id="kb-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-warm-surfaceDark border border-warm-borderMuted rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-warm-line focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {KB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </form>
    </ResponsiveModal>
  );
}
