"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function KnowledgeDetailPage({ params }) {
  const { id } = use(params);
  const entry = useQuery(api.knowledge.get, { id });
  const updateEntry = useMutation(api.knowledge.update);
  const removeEntry = useMutation(api.knowledge.remove);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  if (!entry) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#1C1917] rounded-lg animate-pulse w-1/3" />
        <div className="h-40 bg-[#1C1917] border border-[#2C2825] rounded-xl animate-pulse" />
      </div>
    );
  }

  function startEdit() {
    setForm({ title: entry.title, content: entry.content, category: entry.category });
    setEditing(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    await updateEntry({ id, ...form });
    setEditing(false);
  }

  async function handleDelete() {
    await removeEntry({ id });
    router.push("/knowledge");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/knowledge"
          className="font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] transition"
        >
          ← Back
        </Link>
        <div className="flex gap-2">
          <button
            onClick={startEdit}
            className="font-space-grotesk text-sm text-[#D97757] hover:text-[#C26242] transition"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="font-space-grotesk text-sm text-[#A8A29E] hover:text-red-400 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="space-y-4">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-[#1C1917] border border-[#2C2825] rounded-lg px-4 py-3 font-instrument-serif text-2xl text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full bg-[#1C1917] border border-[#2C2825] rounded-lg px-4 py-3 font-space-grotesk text-sm text-[#E7E5E4] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
            rows={12}
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-[#D97757] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="font-space-grotesk text-sm text-[#A8A29E]">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <span className="font-space-grotesk text-xs text-[#D97757] uppercase tracking-wide">
              {entry.category}
            </span>
            <h1 className="mt-1 font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
              {entry.title}
            </h1>
            {entry.source && (
              <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E]">
                Source: {entry.source}
              </p>
            )}
          </div>

          <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
            <p className="font-space-grotesk text-sm text-[#E7E5E4] leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </p>
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[#292524] text-[#A8A29E] text-xs px-2.5 py-1 rounded-md font-space-grotesk"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
