/**
 * Frontend KB category helpers.
 *
 * The category enum itself lives in convex/lib/kbCategories.js — the single
 * source of truth shared with backend prompts, migrations, and the
 * v.union() in convex/schema.js. This module re-exports it and adds the
 * presentation-only pieces (Tailwind accents, user-facing provenance copy)
 * that the backend doesn't need.
 */

import {
  KB_CATEGORIES,
  KB_CATEGORY_LABELS,
} from "../../convex/lib/kbCategories.js";

export {
  KB_CATEGORIES,
  KB_CATEGORY_SLUGS,
  KB_CATEGORY_LABELS,
} from "../../convex/lib/kbCategories.js";

export const KB_CATEGORY_BY_SLUG = Object.fromEntries(
  KB_CATEGORIES.map((c) => [c.slug, c])
);

export function categoryLabel(slug) {
  return KB_CATEGORY_LABELS[slug] || slug;
}

/**
 * Tailwind-friendly accent classes per category. The new UI uses these for
 * badge / icon backgrounds so colors stay consistent across the app.
 */
export const ACCENT_CLASSES = {
  violet: {
    bg: "bg-violet-50 dark:bg-violet-900/20",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-100 dark:border-violet-800/50",
    chipBg: "bg-violet-50 dark:bg-violet-900/20",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-800/50",
    chipBg: "bg-blue-50 dark:bg-blue-900/20",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-800/50",
    chipBg: "bg-amber-50 dark:bg-amber-900/20",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-800/50",
    chipBg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  brand: {
    bg: "bg-[#FDF5F0] dark:bg-[#1F1510]",
    text: "text-[#D97757]",
    border: "border-[#D97757]/20",
    chipBg: "bg-[#FDF5F0] dark:bg-[#1F1510]",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-900/20",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-100 dark:border-pink-800/50",
    chipBg: "bg-pink-50 dark:bg-pink-900/20",
  },
};

/** Knowledge Map + category headers: same warm icon tile as Your Goals & Notes. */
export const KB_CATEGORY_ICON_ACCENT = ACCENT_CLASSES.brand;

// Provenance labels — what the user sees in the Source column / connectors list.
// Frame as "where did this come from" in plain language, not internal type names.
export const SOURCE_TYPE_LABELS = {
  manual: "Added by you",
  upload: "File upload",
  reflection_autocapture: "From a reflection",
  interaction_autocapture: "From a stakeholder note",
  activity_completion_autocapture: "From an activity",
  ai_generated: "From research",
};

// Status labels used by the Recent Entries Type column. Most of the time we
// only care whether something is "ready" (we collapse all success states) vs
// still being processed.
export const TYPE_BADGE_LABELS = {
  ai_enriched: "Ready",
  ai_generated: "Ready",
  imported: "Ready",
  draft: "Processing",
};
