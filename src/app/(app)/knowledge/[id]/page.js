"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../../convex/_generated/api";
import {
  KB_CATEGORIES,
  KB_CATEGORY_BY_SLUG,
  ACCENT_CLASSES,
  SOURCE_TYPE_LABELS,
} from "@/lib/kbCategories";
import DocumentSummaryCard from "@/components/knowledge/DocumentSummaryCard";
import DocumentMemoryList from "@/components/knowledge/DocumentMemoryList";

export default function DocumentDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const doc = useQuery(api.kb.getDocument, { documentId: id });
  const update = useMutation(api.kb.updateDocument);
  const archive = useMutation(api.kb.archiveDocument);

  const [editing, setEditing] = useState(false);
  // Form is derived from the live `doc` query whenever editing starts.
  // Keeping a separate effect-driven state copy creates a render-loop hazard,
  // so `startEditing` snapshots the doc once when the user clicks Edit.
  const [form, setForm] = useState(null);

  function startEditing() {
    if (!doc) return;
    setForm({
      title: doc.title,
      content: doc.content,
      category: doc.category,
    });
    setEditing(true);
  }

  if (doc === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#1C1917] rounded-lg animate-pulse w-1/3" />
        <div className="h-40 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (doc === null) {
    return (
      <div className="text-center py-16 text-sm text-[#A8A29E]">
        Entry not found.
        <div className="mt-4">
          <Link href="/knowledge" className="text-[#D97757] hover:text-[#C26242]">
            ← Back to Knowledge Base
          </Link>
        </div>
      </div>
    );
  }

  const cat = KB_CATEGORY_BY_SLUG[doc.category];
  const accent = cat ? ACCENT_CLASSES[cat.accent] : null;

  async function handleSave(e) {
    e.preventDefault();
    if (!form) return;
    await update({
      documentId: id,
      title: form.title,
      content: form.content,
      category: form.category,
    });
    setEditing(false);
  }

  async function handleArchive() {
    await archive({ documentId: id });
    router.push("/knowledge");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/knowledge"
          className="font-space-grotesk text-sm text-[#A8A29E] hover:text-white transition flex items-center gap-1"
        >
          <Icon icon="solar:arrow-left-linear" width={16} />
          Back to Knowledge Base
        </Link>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={startEditing}
              className="font-space-grotesk text-sm text-[#D97757] hover:text-[#C26242] transition"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleArchive}
            className="font-space-grotesk text-sm text-[#A8A29E] hover:text-red-400 transition"
          >
            Archive
          </button>
        </div>
      </div>

      {editing && form ? (
        <form onSubmit={handleSave} className="space-y-4">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-[#1C1917] border border-[#2C2825] rounded-lg px-4 py-3 font-instrument-serif text-2xl text-white focus:outline-none focus:ring-1 focus:ring-[#D97757]"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="bg-[#1C1917] border border-[#2C2825] rounded-lg px-3 py-2 font-space-grotesk text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#D97757]"
          >
            {KB_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full bg-[#1C1917] border border-[#2C2825] rounded-lg px-4 py-3 font-space-grotesk text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
            rows={16}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition"
            >
              Save & re-enrich
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="font-space-grotesk text-sm text-[#A8A29E] px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2">
              {cat && accent && (
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${accent.bg} ${accent.text} ${accent.border}`}
                >
                  {cat.label}
                </span>
              )}
              <span className="text-[10px] text-[#A8A29E]">
                {SOURCE_TYPE_LABELS[doc.sourceType] || doc.sourceType}
              </span>
            </div>
            <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px] text-white">
              {doc.title}
            </h1>
          </div>

          <DocumentSummaryCard doc={doc} />

          <DocumentMemoryList documentId={id} />

          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#A8A29E] mb-3">
              Source content
            </h3>
            <p className="font-space-grotesk text-sm text-[#E7E5E4] leading-relaxed whitespace-pre-wrap">
              {doc.content}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
