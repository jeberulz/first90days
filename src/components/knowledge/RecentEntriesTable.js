"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import {
  KB_CATEGORY_BY_SLUG,
  KB_CATEGORY_ICON_ACCENT,
  SOURCE_TYPE_LABELS,
  TYPE_BADGE_LABELS,
} from "@/lib/kbCategories";
import { kbCard } from "@/lib/kbKnowledgeChrome";
import { ResponsiveTable } from "@/components/primitives";
import { cn } from "@/lib/utils";

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

// Returns null for any "ready" state — the user only needs to see this column
// when something is actually still processing.
function ProcessingBadge({ type }) {
  if (type !== "draft") return null;
  return (
    <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D97757]">
      <Icon icon="solar:refresh-circle-linear" width={12} />
      {TYPE_BADGE_LABELS[type]}
    </div>
  );
}

function CategoryBadge({ slug }) {
  const cat = KB_CATEGORY_BY_SLUG[slug];
  if (!cat) return null;
  const a = KB_CATEGORY_ICON_ACCENT;
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${a.bg} ${a.text} ${a.border}`}
    >
      {cat.label}
    </span>
  );
}

function EntryCell({ doc }) {
  const cat = KB_CATEGORY_BY_SLUG[doc.category];
  const a = KB_CATEGORY_ICON_ACCENT;
  return (
    <Link href={`/knowledge/${doc._id}`} className="flex items-center gap-3 group">
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${a.bg} ${a.text} ${a.border}`}
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

  // Only show the status column when at least one row is still processing.
  // If everything is ready, the column adds noise without information.
  const hasProcessing = (docs || []).some((d) => d.type === "draft");

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
    ...(hasProcessing
      ? [
          {
            key: "status",
            header: "Status",
            cell: (d) => <ProcessingBadge type={d.type} />,
          },
        ]
      : []),
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
    <section className={cn(kbCard, "overflow-hidden")}>
      <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-md border shrink-0 ${KB_CATEGORY_ICON_ACCENT.bg} ${KB_CATEGORY_ICON_ACCENT.text} ${KB_CATEGORY_ICON_ACCENT.border}`}
          >
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
          emptyLabel="No entries yet. Click Add Knowledge above to add your first one."
          variant="knowledge"
        />
      </div>
    </section>
  );
}
