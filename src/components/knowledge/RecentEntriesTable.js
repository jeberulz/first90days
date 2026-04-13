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
    ai_generated: { icon: "solar:brain-linear", className: "text-[#D97757]" },
    imported: { icon: "solar:document-linear", className: "text-[#A8A29E]" },
    draft: { icon: "solar:pen-linear", className: "text-[#A8A29E]" },
  };
  const meta = map[type] || map.draft;
  return (
    <div className={`flex items-center gap-1 text-[10px] font-medium ${meta.className}`}>
      <Icon icon={meta.icon} width={12} />
      {TYPE_BADGE_LABELS[type] || type}
    </div>
  );
}

export default function RecentEntriesTable() {
  const docs = useQuery(api.kb.recentDocuments, { limit: 8 });

  return (
    <section className="bg-[#1C1917] rounded-xl border border-[#2C2825] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#2C2825] rounded-md text-white">
            <Icon icon="solar:clock-circle-linear" width={18} />
          </div>
          <h2 className="text-base font-medium tracking-tight text-white">
            Recent Entries
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-b border-[#2C2825]">
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#A8A29E] px-6 py-3">
                Entry
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#A8A29E] px-4 py-3 hidden md:table-cell">
                Category
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#A8A29E] px-4 py-3 hidden lg:table-cell">
                Source
              </th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#A8A29E] px-4 py-3 hidden sm:table-cell">
                Type
              </th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#A8A29E] px-6 py-3">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {docs === undefined && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#A8A29E]">
                  Loading…
                </td>
              </tr>
            )}
            {docs && docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-[#A8A29E]">
                  No entries yet.
                </td>
              </tr>
            )}
            {docs &&
              docs.map((d) => {
                const cat = KB_CATEGORY_BY_SLUG[d.category];
                const accent = cat ? ACCENT_CLASSES[cat.accent] : null;
                return (
                  <tr
                    key={d._id}
                    className="border-b border-[#2C2825] last:border-0 hover:bg-[#2C2825]/20 transition-colors group"
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/knowledge/${d._id}`}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                            accent ? `${accent.bg} ${accent.text} ${accent.border}` : "bg-[#2C2825] border-[#44403C]"
                          }`}
                        >
                          <Icon icon={cat?.icon || "solar:file-text-linear"} width={14} />
                        </div>
                        <span className="text-sm font-medium text-white truncate max-w-xs group-hover:text-[#D97757] transition-colors">
                          {d.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {cat && accent && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${accent.bg} ${accent.text} ${accent.border}`}
                        >
                          {cat.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-[#A8A29E]">
                        {SOURCE_TYPE_LABELS[d.sourceType] || d.sourceType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <TypeBadge type={d.type} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-xs text-[#A8A29E]">
                        {relativeTime(d._creationTime)}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
