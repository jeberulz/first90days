/**
 * Frontend mirror of convex/lib/kbCategories.js.
 * Both files MUST stay in sync. Adding a category requires updating both
 * AND the v.union() in convex/schema.js (kbDocuments.category).
 */

export const KB_CATEGORIES = [
  {
    slug: "company_context",
    label: "Company Context",
    description:
      "Mission, values, org structure, company history, culture docs, and strategic priorities.",
    icon: "solar:buildings-2-linear",
    accent: "violet",
  },
  {
    slug: "team_people",
    label: "Team & People",
    description:
      "Stakeholder map, reporting lines, communication styles, team dynamics and preferences.",
    icon: "solar:users-group-rounded-linear",
    accent: "blue",
  },
  {
    slug: "product_technology",
    label: "Product & Technology",
    description:
      "Architecture docs, tech stack, product roadmap, feature specs, and system diagrams.",
    icon: "solar:code-square-linear",
    accent: "amber",
  },
  {
    slug: "processes_workflows",
    label: "Processes & Workflows",
    description:
      "Sprint cadences, review processes, deployment workflows, and decision frameworks.",
    icon: "solar:routing-2-linear",
    accent: "emerald",
  },
  {
    slug: "goals_notes",
    label: "Your Goals & Notes",
    description:
      "Personal onboarding goals, meeting notes, questions, reflections and observations.",
    icon: "solar:document-text-linear",
    accent: "brand",
  },
  {
    slug: "industry_market",
    label: "Industry & Market",
    description:
      "Competitive landscape, market trends, customer personas, and industry terminology.",
    icon: "solar:chart-2-linear",
    accent: "pink",
  },
];

export const KB_CATEGORY_SLUGS = KB_CATEGORIES.map((c) => c.slug);

export const KB_CATEGORY_LABELS = Object.fromEntries(
  KB_CATEGORIES.map((c) => [c.slug, c.label])
);

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

export const SOURCE_TYPE_LABELS = {
  manual: "Manual",
  upload: "Upload",
  reflection_autocapture: "Reflection",
  interaction_autocapture: "Interaction",
  activity_completion_autocapture: "Activity Note",
  ai_generated: "AI Generated",
};

export const TYPE_BADGE_LABELS = {
  ai_enriched: "AI Enriched",
  ai_generated: "AI Generated",
  imported: "Imported",
  draft: "Draft",
};
