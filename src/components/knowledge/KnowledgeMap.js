"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import { KB_CATEGORIES, KB_CATEGORY_ICON_ACCENT } from "@/lib/kbCategories";
import { kbCard, kbCardHover } from "@/lib/kbKnowledgeChrome";
import { cn } from "@/lib/utils";

export default function KnowledgeMap() {
  const stats = useQuery(api.kb.categoryStats);
  const byCat = stats
    ? Object.fromEntries(stats.map((s) => [s.slug, s]))
    : {};

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium tracking-tight text-white">Knowledge Map</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {KB_CATEGORIES.map((cat) => {
          const stat = byCat[cat.slug];
          const running = stat?.running ?? 0;

          return (
            <Link
              key={cat.slug}
              href={`/knowledge/category/${cat.slug}`}
              className={cn("group p-5", kbCard, kbCardHover)}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2 rounded-lg border ${KB_CATEGORY_ICON_ACCENT.bg} ${KB_CATEGORY_ICON_ACCENT.text} ${KB_CATEGORY_ICON_ACCENT.border}`}
                >
                  <Icon icon={cat.icon} width={20} />
                </div>
                {running > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1F1510] text-[#D97757] border border-[#D97757]/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-pulse" />
                    Processing
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium tracking-tight text-white mb-1">
                {cat.label}
              </h3>
              <p className="text-xs text-[#A8A29E] mb-4 leading-relaxed line-clamp-2">
                {cat.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#A8A29E]">
                  {stat?.count ?? 0} entries
                </span>
                <Icon
                  icon="solar:arrow-right-linear"
                  width={16}
                  className="text-[#A8A29E] group-hover:text-[#D97757] group-hover:translate-x-0.5 transition-all"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
