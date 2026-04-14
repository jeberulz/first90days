"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import {
  KB_CATEGORY_BY_SLUG,
  ACCENT_CLASSES,
  SOURCE_TYPE_LABELS,
  TYPE_BADGE_LABELS,
} from "@/lib/kbCategories";
import { ResponsiveTable } from "@/components/primitives";

function relativeTime(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function TypeBadge({ type }) {
  const map = {
    ai_enriched: { icon: "solar:verified-check-linear", className: "text-emerald-400" },
    ai_generated: { icon: "solar:cpu-bolt-linear", className: "text-[#D97757]" },
    imported: { icon: "solar:document-linear", className: "text-[#A8A29E]" },
    draft: { icon: "solar:pen-linear", className: "text-[#A8A29E]" },
  };
  const meta = map[type] || map.draft;
  return (
    <div className={`inline-flex items-center gap-1 text-[11px] font-medium ${meta.className}`}>
      <Icon icon={meta.icon} width={12} />
      {TYPE_BADGE_LABELS[type] || type}
    </div>
  );
}

function CategoryBadge({ slug }) {
  const cat = KB_CATEGORY_BY_SLUG[slug];
  if (!cat) return null;
  const accent = ACCENT_CLASSES[cat.accent];
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${accent.bg} ${accent.text} ${accent.border}`}
    >
      {cat.label}
    </span>
  );
}

function EntryCell({ doc }) {
  const cat = KB_CATEGORY_BY_SLUG[doc.category];
  const accent = cat ? ACCENT_CLASSES[cat.accent] : null;
  return (
    <Link href={`/knowledge/${doc._id}`} className="flex items-center gap-3 group">
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
          accent ? `${accent.bg} ${accent.text} ${accent.border}` : "bg-[#2C2825] border-[#44403C]"
        }`}
      >
        <Icon icon={cat?.icon || "solar:file-text-linear"} width={14} />
      </div>
      <span className="text-sm font-medium text-white line-clamp-2 group-hover:text-accent transition-colors">
        {doc.title}
      </span>
    </Link>
  );
}

export default function RecentEntriesTable() {
  const docs = useQuery(api.kb.recentDocuments, { limit: 8 });

  const columns = [
    {
      key: "title",
      header: "Entry",
      primary: true,
      cell: (d) => <EntryCell doc={d} />,
    },
    {
      key: "category",
      header: "Category",
      hideBelow: "md",
      cell: (d) => <CategoryBadge slug={d.category} />,
    },
    {
      key: "source",
      header: "Source",
      hideBelow: "lg",
      cell: (d) => (
        <span className="text-xs text-[#A8A29E]">
          {SOURCE_TYPE_LABELS[d.sourceType] || d.sourceType}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (d) => <TypeBadge type={d.type} />,
    },
    {
      key: "updated",
      header: "Updated",
      cell: (d) => (
        <span className="text-xs text-[#A8A29E]">
          {relativeTime(d._creationTime)}
        </span>
      ),
    },
  ];

  return (
    <section className="bg-[#1C1917] rounded-xl border border-[#2C2825] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#2C2825] rounded-md text-white">
            <Icon icon="solar:clock-circle-linear" width={18} />
          </div>
          <h2 className="text-lg font-medium tracking-tight text-white">
            Recent Entries
          </h2>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <ResponsiveTable
          columns={columns}
          rows={docs || []}
          getRowKey={(d) => d._id}
          loading={docs === undefined}
          emptyLabel="No entries yet. Click Add Knowledge above to seed the brain."
        />
      </div>
    </section>
  );
}
