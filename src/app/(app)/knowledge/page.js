"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import AIBrainStatusCard from "@/components/knowledge/AIBrainStatusCard";
import DraftReviewQueue from "@/components/knowledge/DraftReviewQueue";
import KnowledgeMap from "@/components/knowledge/KnowledgeMap";
import ConnectedSources from "@/components/knowledge/ConnectedSources";
import AIEnrichmentQueue from "@/components/knowledge/AIEnrichmentQueue";
import RecentEntriesTable from "@/components/knowledge/RecentEntriesTable";
import AddKnowledgeModal from "@/components/knowledge/AddKnowledgeModal";
import SearchModal from "@/components/knowledge/SearchModal";
import { ErrorBoundary } from "@/components/primitives";
import { kbToolbarBtn } from "@/lib/kbKnowledgeChrome";
import { cn } from "@/lib/utils";

function SectionErrorFallback({ label }) {
  return (
    <div className="rounded-xl border border-[#44403C]/90 bg-[#1C1917]/60 px-4 py-6 text-center">
      <p className="font-space-grotesk text-sm text-[#A8A29E]">
        {label} couldn&apos;t load. Refresh the page or try again shortly.
      </p>
    </div>
  );
}

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
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight text-white">
            Knowledge Base
          </h1>
          <p className="font-space-grotesk text-xs sm:text-sm text-[#A8A29E] mt-1">
            Your AI-enriched memory — everything First90 knows about your onboarding context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search knowledge"
            className={cn(
              kbToolbarBtn,
              "flex sm:hidden items-center justify-center w-11 h-11"
            )}
          >
            <Icon icon="solar:magnifer-linear" width={18} />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              kbToolbarBtn,
              "hidden sm:flex items-center gap-2 px-3 py-2 text-sm min-h-11"
            )}
          >
            <Icon icon="solar:magnifer-linear" width={16} />
            <span>Search knowledge…</span>
            <kbd className="ml-2 text-[10px] bg-[#1C1917] border border-[#44403C]/80 text-[#A8A29E] px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm min-h-11"
          >
            <Icon icon="solar:add-circle-linear" width={16} />
            <span className="hidden xs:inline">Add Knowledge</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* AI Brain Status */}
      <ErrorBoundary fallback={<SectionErrorFallback label="Brain status" />}>
        <AIBrainStatusCard />
      </ErrorBoundary>

      {/* Company research drafts awaiting review */}
      <ErrorBoundary fallback={<SectionErrorFallback label="Research drafts" />}>
        <DraftReviewQueue />
      </ErrorBoundary>

      {/* Knowledge Map */}
      <ErrorBoundary fallback={<SectionErrorFallback label="Knowledge map" />}>
        <KnowledgeMap />
      </ErrorBoundary>

      {/* Two-col: recent entries (primary) + sources/queue (meta).
          Memory stream lives on each doc detail page now (DocumentMemoryList)
          since memories are an audit trail of one doc, not a top-level surface. */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <ErrorBoundary fallback={<SectionErrorFallback label="Recent entries" />}>
            <RecentEntriesTable />
          </ErrorBoundary>
        </div>
        <div className="xl:col-span-2 space-y-6">
          <ErrorBoundary fallback={<SectionErrorFallback label="Connected sources" />}>
            <ConnectedSources />
          </ErrorBoundary>
          <ErrorBoundary fallback={<SectionErrorFallback label="Enrichment queue" />}>
            <AIEnrichmentQueue />
          </ErrorBoundary>
        </div>
      </div>

      <AddKnowledgeModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
