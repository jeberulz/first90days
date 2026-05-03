export const ACTIVITY_CATEGORIES = [
  { slug: "learning", label: "Learning", icon: "solar:book-2-linear" },
  { slug: "shipping", label: "Shipping", icon: "solar:rocket-linear" },
  {
    slug: "relationships",
    label: "Relationships",
    icon: "solar:users-group-rounded-linear",
  },
  { slug: "influence", label: "Influence", icon: "solar:graph-up-linear" },
];

export const ACTIVITY_CATEGORY_BY_SLUG = Object.fromEntries(
  ACTIVITY_CATEGORIES.map((c) => [c.slug, c])
);

// Static class strings so the Tailwind JIT can see them at build time.
export const ACTIVITY_CATEGORY_STYLES = {
  learning: {
    dot: "bg-blue-400",
    chipBg: "bg-blue-500/10",
    chipText: "text-blue-300",
    borderL: "border-l-blue-500",
  },
  shipping: {
    dot: "bg-green-400",
    chipBg: "bg-green-500/10",
    chipText: "text-green-300",
    borderL: "border-l-green-500",
  },
  relationships: {
    dot: "bg-amber-400",
    chipBg: "bg-amber-500/10",
    chipText: "text-amber-300",
    borderL: "border-l-amber-500",
  },
  influence: {
    dot: "bg-purple-400",
    chipBg: "bg-purple-500/10",
    chipText: "text-purple-300",
    borderL: "border-l-purple-500",
  },
};

export function getCategoryStyle(slug) {
  return ACTIVITY_CATEGORY_STYLES[slug] || ACTIVITY_CATEGORY_STYLES.learning;
}

export function getCategoryMeta(slug) {
  return ACTIVITY_CATEGORY_BY_SLUG[slug] || ACTIVITY_CATEGORY_BY_SLUG.learning;
}
