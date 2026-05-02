import { SAMPLE_ROLES } from "@/lib/sampleData";

// Static sitemap. Includes the public marketing pages and every curated
// /sample/[role] page so search engines can index them. User-public
// /p/[slug] pages are deliberately excluded — those are not indexed
// by default (see metadata in src/app/p/[slug]/page.js).

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://usearcora.com";

export default function sitemap() {
  const now = new Date().toISOString();

  const core = [
    { url: `${APP_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${APP_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${APP_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const samples = SAMPLE_ROLES.map((r) => ({
    url: `${APP_URL}/sample/${r.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...core, ...samples];
}
