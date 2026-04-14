"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../../../../convex/_generated/api";
import {
  KB_CATEGORY_BY_SLUG,
  KB_CATEGORY_ICON_ACCENT,
  SOURCE_TYPE_LABELS,
  TYPE_BADGE_LABELS,
} from "@/lib/kbCategories";
import { kbField } from "@/lib/kbKnowledgeChrome";
import { cn } from "@/lib/utils";
import AddKnowledgeModal from "@/components/knowledge/AddKnowledgeModal";

// Per-category empty-state suggestions. Concrete examples beat generic
// "Add knowledge" copy — the user instantly knows what kind of doc fits.
const EMPTY_STATE_SUGGESTIONS = {
  company_context:
    "Try: org chart, mission statement, strategic priorities, recent all-hands notes, founder bio.",
  team_people:
    "Try: stakeholder bios, communication preferences, reporting lines, 1:1 meeting notes.",
  product_technology:
    "Try: architecture diagrams, tech stack overview, roadmap docs, on-call playbook, system READMEs.",
  processes_workflows:
    "Try: sprint cadence, code review checklist, deploy process, decision frameworks.",
  goals_notes:
    "Try: your 30/60/90 goals, daily reflections, questions you want to ask, observations.",
  industry_market:
    "Try: competitor briefs, customer personas, market reports, glossary of industry terms.",
};

function relativeTime(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function CategoryDetailPage({ params }) {
  const { slug } = use(params);
  const cat = KB_CATEGORY_BY_SLUG[slug];
  const iconAccent = KB_CATEGORY_ICON_ACCENT;
  const docs = useQuery(api.kb.listDocuments, { category: slug, limit: 200 });
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  if (!cat) {
    return (
      <div className="text-center py-16 text-sm text-[#A8A29E]">
        Unknown category.
      </div>
    );
  }

  const filtered = (docs || []).filter((d) =>
    !search || d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-2 text-xs text-[#A8A29E] hover:text-[#D97757] transition-colors w-fit"
      >
        <Icon icon="solar:arrow-left-linear" width={16} />
        Back to Knowledge Base
      </Link>

      <div className="flex items-start gap-4 min-w-0">
        <div
          className={`shrink-0 p-3 rounded-xl border ${iconAccent.bg} ${iconAccent.text} ${iconAccent.border}`}
        >
          <Icon icon={cat.icon} width={28} aria-hidden />
        </div>
        <div className="min-w-0 pt-0.5">
          <h1 className="font-instrument-serif text-3xl sm:text-4xl tracking-[-0.5px] sm:tracking-[-0.9px] leading-tight text-white">
            {cat.label}
          </h1>
          <p className="font-space-grotesk text-sm text-[#A8A29E] mt-2 leading-relaxed max-w-2xl">
            {cat.description}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className={cn(kbField, "flex-1 flex items-center gap-2 min-h-11 px-3")}>
          <Icon icon="solar:magnifer-linear" width={16} className="text-[#A8A29E] shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${cat.label.toLowerCase()}…`}
            className="flex-1 min-w-0 bg-transparent font-space-grotesk text-sm text-white placeholder:text-[#57534E] focus:outline-none py-2.5"
          />
        </div>
        <span className="text-xs text-[#A8A29E] tabular-nums shrink-0 sm:text-right">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs === undefined && (
          <div className="col-span-full text-sm text-[#A8A29E] py-12 text-center">
            Loading…
          </div>
        )}
        {docs && filtered.length === 0 && (
          <div className="col-span-full bg-[#1C1917] border border-[#44403C]/90 rounded-xl p-10 text-center">
            {search ? (
              <p className="font-space-grotesk text-sm text-[#A8A29E]">
                No entries match <span className="text-white">&ldquo;{search}&rdquo;</span> in {cat.label}.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${iconAccent.bg} ${iconAccent.text} ${iconAccent.border}`}
                >
                  <Icon icon={cat.icon} width={26} aria-hidden />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="font-space-grotesk text-base font-medium text-white">
                    Nothing in {cat.label} yet
                  </h3>
                  <p className="font-space-grotesk text-sm text-[#A8A29E]">
                    {EMPTY_STATE_SUGGESTIONS[slug] ||
                      "Add a doc and we'll categorize, summarize, and pull out the key facts within about 30 seconds."}
                  </p>
                </div>
                <button
                  onClick={() => setAddOpen(true)}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm min-h-11"
                >
                  <Icon icon="solar:add-circle-linear" width={16} />
                  Add to {cat.label}
                </button>
              </div>
            )}
          </div>
        )}
        {filtered.map((d) => (
          <Link
            key={d._id}
            href={`/knowledge/${d._id}`}
            className="bg-[#1C1917] border border-[#44403C]/90 rounded-xl p-5 shadow-sm hover:border-[#D97757]/25 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#A8A29E]">
                {SOURCE_TYPE_LABELS[d.sourceType] || d.sourceType}
              </span>
              <span className="text-[10px] text-[#A8A29E]">
                {TYPE_BADGE_LABELS[d.type] || d.type}
              </span>
            </div>
            <h3 className="text-base font-medium text-white">{d.title}</h3>
            {d.summary ? (
              <p className="mt-2 text-sm text-[#A8A29E] line-clamp-3">{d.summary}</p>
            ) : (
              <p className="mt-2 text-sm text-[#A8A29E] line-clamp-3">{d.content}</p>
            )}
            <div className="mt-3 text-[10px] text-[#A8A29E]">
              {relativeTime(d._creationTime)}
            </div>
          </Link>
        ))}
      </div>

      <AddKnowledgeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultCategory={slug}
      />
    </div>
  );
}
