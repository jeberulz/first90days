"use client";

import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";
import { KB_CATEGORIES } from "@/lib/kbCategories";

const TOTAL_CATEGORIES = KB_CATEGORIES.length;

/**
 * Knowledge base status card. Replaces the old multi-stat dashboard with one
 * status sentence + one suggested next action — the page is for trust and
 * action, not metrics.
 *
 * State machine driven by entries-on-hand and category coverage:
 *   - empty  → "Your knowledge base is empty" + Add knowledge
 *   - partial → "X entries across Y of N categories" + Add to <next gap>
 *   - full   → "X entries across all N categories" + Add knowledge (chip)
 *
 * Processing state overrides the subline ("Processing N…") and pulses the
 * icon ring. The number remains visible because users mid-add want to know
 * their entry was counted.
 */
export default function KnowledgeStatusCard({ onAddKnowledge }) {
  const status = useQuery(api.kb.brainStatus);
  const categoryStats = useQuery(api.kb.categoryStats);

  if (status === undefined || categoryStats === undefined) {
    return (
      <div className="rounded-xl border border-[#44403C]/90 bg-[#1C1917] p-6 animate-pulse h-32" />
    );
  }

  const filledCategories = categoryStats.filter((c) => c.count > 0);
  const filledCount = filledCategories.length;
  const isWorking = status.runningJobs > 0 || status.queuedJobs > 0;

  // Pick the first empty category in declaration order. Stable, predictable,
  // doesn't require knowing what plan stage the user is in.
  const nextEmptySlug = KB_CATEGORIES.find(
    (cat) => (categoryStats.find((s) => s.slug === cat.slug)?.count ?? 0) === 0
  )?.slug;
  const nextEmptyCat = nextEmptySlug
    ? KB_CATEGORIES.find((c) => c.slug === nextEmptySlug)
    : null;

  // Three states: empty, partial, full.
  const isEmpty = status.documentCount === 0;
  const isFull = filledCount === TOTAL_CATEGORIES;

  let headline;
  let subline;
  if (isEmpty) {
    headline = "Your knowledge base is empty.";
    subline = "Add your first document so Arcora can start grounding your plan.";
  } else if (isFull) {
    headline = `${status.documentCount} ${status.documentCount === 1 ? "entry" : "entries"} across all ${TOTAL_CATEGORIES} categories.`;
    subline = "Arcora has rich context for every plan and suggestion.";
  } else {
    headline = `${status.documentCount} ${status.documentCount === 1 ? "entry" : "entries"} across ${filledCount} of ${TOTAL_CATEGORIES} categories.`;
    subline = nextEmptyCat
      ? `Add ${nextEmptyCat.label} context next to round out what Arcora knows.`
      : `${TOTAL_CATEGORIES - filledCount} categories still empty.`;
  }

  const processingSubline =
    status.runningJobs + status.queuedJobs > 0
      ? `Processing ${status.runningJobs + status.queuedJobs} ${
          status.runningJobs + status.queuedJobs === 1 ? "entry" : "entries"
        } — ready in a few seconds.`
      : null;

  function handlePrimary() {
    if (!onAddKnowledge) return;
    if (!isEmpty && !isFull && nextEmptyCat) {
      onAddKnowledge(nextEmptyCat.slug);
    } else {
      onAddKnowledge();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D97757]/20 bg-gradient-to-br from-[#1C1917] via-[#1C1917] to-[#1F1510] p-5 sm:p-6 shadow-sm">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97757]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#D97757]/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#D97757]/30 to-[#D97757]/10 flex items-center justify-center relative border border-[#D97757]/20">
            <Icon
              icon="solar:notes-minimalistic-linear"
              width={32}
              className="text-[#D97757]"
            />
            {isWorking && (
              <div className="absolute inset-0 rounded-2xl border-2 border-[#D97757]/30 animate-ping" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-medium tracking-tight text-white leading-snug">
            {headline}
          </p>
          <p className="text-xs sm:text-sm text-[#A8A29E] mt-1.5 max-w-xl">
            {processingSubline ?? subline}
          </p>
        </div>

        <div className="flex flex-col xs:flex-row sm:flex-col lg:flex-row items-stretch sm:items-end lg:items-center gap-2 shrink-0">
          {!isEmpty && !isFull && nextEmptyCat ? (
            <>
              <button
                type="button"
                onClick={handlePrimary}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
              >
                <Icon icon="solar:add-circle-linear" width={16} />
                Add {nextEmptyCat.label}
              </button>
              <button
                type="button"
                onClick={() => onAddKnowledge?.()}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg border border-[#44403C]/90 bg-[#1C1917] text-sm text-[#A8A29E] hover:border-[#D97757]/30 hover:text-white transition-colors"
              >
                Add anything else
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handlePrimary}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Icon icon="solar:add-circle-linear" width={16} />
              Add knowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
