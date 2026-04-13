"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import AIBrainStatusCard from "@/components/knowledge/AIBrainStatusCard";
import KnowledgeMap from "@/components/knowledge/KnowledgeMap";
import AIMemoryStream from "@/components/knowledge/AIMemoryStream";
import ConnectedSources from "@/components/knowledge/ConnectedSources";
import AIEnrichmentQueue from "@/components/knowledge/AIEnrichmentQueue";
import RecentEntriesTable from "@/components/knowledge/RecentEntriesTable";
import AddKnowledgeModal from "@/components/knowledge/AddKnowledgeModal";
import SearchModal from "@/components/knowledge/SearchModal";

export default function KnowledgeBasePage() {
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K shortcut — only on /knowledge* routes (this page lives there).
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px] text-white">
            Knowledge Base
          </h1>
          <p className="text-sm text-[#A8A29E] mt-1">
            Your AI-enriched memory — everything First90 knows about your onboarding context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2C2825] bg-[#1C1917] text-sm text-[#A8A29E] hover:border-[#D97757]/30"
          >
            <Icon icon="solar:magnifer-linear" width={16} />
            <span>Search knowledge…</span>
            <kbd className="ml-2 text-[10px] bg-[#2C2825] text-[#A8A29E] px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#D97757] hover:bg-[#C26242] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Icon icon="solar:add-circle-linear" width={16} />
            Add Knowledge
          </button>
        </div>
      </div>

      {/* AI Brain Status */}
      <AIBrainStatusCard />

      {/* Knowledge Map */}
      <KnowledgeMap />

      {/* Two-col: memory stream + sources/queue */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <AIMemoryStream />
        </div>
        <div className="xl:col-span-2 space-y-6">
          <ConnectedSources />
          <AIEnrichmentQueue />
        </div>
      </div>

      {/* Recent entries */}
      <RecentEntriesTable />

      <AddKnowledgeModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
