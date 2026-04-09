"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

const categories = ["All", "Notes", "Articles", "Resources", "Templates"];

export default function KnowledgePage() {
  const entries = useQuery(api.knowledge.list, {});
  const createEntry = useMutation(api.knowledge.create);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "Notes",
    tags: "",
    source: "",
  });

  const filtered = (entries || [])
    .filter((e) => activeCategory === "All" || e.category === activeCategory)
    .filter(
      (e) =>
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

  async function handleCreate(e) {
    e.preventDefault();
    await createEntry({
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : undefined,
      source: form.source || undefined,
    });
    setForm({ title: "", content: "", category: "Notes", tags: "", source: "" });
    setShowForm(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
            Knowledge Base
          </h1>
          <p className="mt-2 font-space-grotesk text-base text-[#A8A29E]">
            {entries?.length || 0} entries
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-4 py-2 font-space-grotesk text-sm font-medium transition shadow-sm"
        >
          Add Note
        </button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base..."
          className="w-full bg-[#1C1917] border border-[#2C2825] rounded-lg px-4 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
        />
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-space-grotesk text-xs transition ${
                activeCategory === cat
                  ? "bg-[#D97757] text-white"
                  : "bg-[#1C1917] text-[#A8A29E] border border-[#2C2825] hover:border-[#44403C]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full bg-[#1C1917] border border-[#2C2825] rounded-xl p-8 text-center">
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              {searchQuery
                ? "No entries match your search."
                : "No entries yet. Start building your knowledge base."}
            </p>
          </div>
        )}
        {filtered.map((entry) => (
          <Link
            key={entry._id}
            href={`/knowledge/${entry._id}`}
            className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-5 hover:border-[#44403C] transition"
          >
            <span className="font-space-grotesk text-xs text-[#D97757] uppercase tracking-wide">
              {entry.category}
            </span>
            <h3 className="mt-1 font-space-grotesk text-base font-medium text-[#E7E5E4]">
              {entry.title}
            </h3>
            <p className="mt-2 font-space-grotesk text-sm text-[#A8A29E] line-clamp-3">
              {entry.content}
            </p>
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex gap-1.5 mt-3">
                {entry.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#292524] text-[#A8A29E] text-xs px-2 py-0.5 rounded font-space-grotesk"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Add note modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-[#1C1917] border border-[#2C2825] rounded-xl w-full max-w-lg p-6 space-y-4"
          >
            <h3 className="font-instrument-serif text-xl text-[#E7E5E4]">
              Add to Knowledge Base
            </h3>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                placeholder="Title"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] resize-none focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                rows={5}
                placeholder="Write your notes..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                >
                  {categories.filter((c) => c !== "All").map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Source</label>
                <input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                  placeholder="URL or reference"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-space-grotesk text-xs font-medium text-[#A8A29E]">Tags (comma separated)</label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] placeholder:text-[#57534E] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
                placeholder="e.g. onboarding, process, team"
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
