/**
 * Single source of truth for the 6 KB categories.
 * Mirrored at src/lib/kbCategories.js for the frontend.
 * Keep both files in sync — adding a category requires updating both
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

export function isKbCategory(slug) {
  return KB_CATEGORY_SLUGS.includes(slug);
}

/**
 * Map legacy `knowledgeEntries.category` strings to the new 6-category enum.
 * Used only by the one-shot legacy migration. Anything unmapped falls back to
 * goals_notes — the catch-all for personal notes.
 */
export function mapLegacyCategory(legacy) {
  if (!legacy) return "goals_notes";
  const norm = legacy.toString().trim().toLowerCase();
  switch (norm) {
    case "notes":
      return "goals_notes";
    case "articles":
      return "industry_market";
    case "resources":
    case "templates":
      return "processes_workflows";
    default:
      return "goals_notes";
  }
}

/**
 * Default importance scores per source type. Used at insert time when the
 * caller hasn't set one explicitly. Enrichment may overwrite these later.
 */
export const DEFAULT_IMPORTANCE_BY_SOURCE = {
  manual: 60,
  upload: 60,
  reflection_autocapture: 40,
  interaction_autocapture: 55,
  activity_completion_autocapture: 35,
  ai_generated: 50,
};

/**
 * Display labels for source types — used by the new UI badges.
 */
export const SOURCE_TYPE_LABELS = {
  manual: "Manual",
  upload: "Upload",
  reflection_autocapture: "Reflection",
  interaction_autocapture: "Interaction",
  activity_completion_autocapture: "Activity Note",
  ai_generated: "AI Generated",
};
