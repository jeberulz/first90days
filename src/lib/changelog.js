/**
 * Changelog entries for Arcora.
 *
 * Entry shape:
 *   {
 *     id:      string                          kebab slug, used as <section id>
 *     date:    'YYYY-MM-DD'                    release date
 *     title:   string                          headline
 *     summary: string                          1-2 sentence plain-English description
 *     tags:    ('new' | 'improved' | 'fixed')[]
 *     items?:  string[]                        optional bulleted sub-changes
 *   }
 *
 * Order: NEWEST FIRST. Add new entries to the top of the array.
 */
export const CHANGELOG = [
  {
    id: "brand-refresh-and-avatar-polish",
    date: "2026-05-02",
    title: "Brand refresh and avatar polish",
    summary:
      "First90 is now Arcora. Same product, sharper name — plus a handful of UI fixes users were asking about.",
    tags: ["improved", "fixed"],
    items: [
      "Rebranded First90 → Arcora across the app, transactional emails, and config",
      "Sidebar and mobile More menu now show your uploaded avatar",
      "Pre-boarding and phase progress bars fill proportionally to real checklist progress, not hardcoded full",
    ],
  },
  {
    id: "branded-transactional-emails",
    date: "2026-04-25",
    title: "Branded transactional emails",
    summary:
      "Every email Arcora sends — verification, password reset, plan-ready, dunning — now uses brand-consistent HTML.",
    tags: ["new", "improved"],
    items: [
      "Tier 1 transactional notifications powered by Resend",
      "Brand-consistent HTML for all auth and lifecycle templates",
    ],
  },
  {
    id: "onboarding-and-accessibility-fixes",
    date: "2026-04-25",
    title: "Onboarding and accessibility fixes",
    summary:
      "Cleaned up edge cases in the onboarding wizard and added the autoComplete attributes screen readers expect.",
    tags: ["fixed"],
    items: [
      "Stakeholders and scope now persist across wizard steps",
      "Missing autoComplete attributes added to forms; plan-generation copy made more honest",
      "CSP fix so Convex-hosted avatars actually render",
      "Removed a duplicate 'page will update' line in plan-loading copy",
    ],
  },
  {
    id: "account-security-controls",
    date: "2026-04-17",
    title: "Account security controls",
    summary:
      "You can now manage your own account security — change passwords, view sessions, update email, and recover access if you forget your password.",
    tags: ["new"],
    items: [
      "Password reset and email verification flows",
      "Stronger password policy",
      "Password change, account lockout after repeated failures, active session list",
      "Email address change with re-verification",
      "First and last name on signup, synced into onboarding",
    ],
  },
  {
    id: "landing-page-expansion",
    date: "2026-04-17",
    title: "Landing page: methodology, examples, pricing",
    summary:
      "New sections on the landing page covering how Arcora builds your plan, real examples, and transparent pricing.",
    tags: ["new", "improved"],
    items: [
      "Methodology, Examples, and Pricing sections added to the landing page",
      "Back-to-home links on login and signup",
      "Friendlier error message on the password reset page",
    ],
  },
  {
    id: "onboarding-skip-and-recovery",
    date: "2026-04-16",
    title: "Onboarding skip and recovery",
    summary:
      "Skipping onboarding no longer leaves you with empty pages and no way back. Plan context is also editable after onboarding.",
    tags: ["improved", "fixed"],
    items: [
      "Empty states added across all pages when onboarding is skipped",
      "Re-engagement prompts to finish onboarding when you're ready",
      "Plan context can now be edited after onboarding completes",
      "Mobile landing page dashboard mockups no longer overflow on small screens",
    ],
  },
  {
    id: "knowledge-base-v2",
    date: "2026-04-15",
    title: "Knowledge base, rebuilt as your personal RAG brain",
    summary:
      "The knowledge base is now a per-user retrieval brain that captures company research, drafts, and notes — and feeds them back into your plan.",
    tags: ["new", "improved"],
    items: [
      "Per-user RAG knowledge base replaces the shared library",
      "Company research drafts created automatically during onboarding",
      "KB surface cleaned up: warm empty states, category-specific CTAs, error boundaries so a single failing query can't break the page",
    ],
  },
  {
    id: "stripe-subscriptions-and-trial",
    date: "2026-04-14",
    title: "Stripe subscriptions and 14-day free trial",
    summary:
      "Pricing is live. Start free for 14 days, upgrade to Pro inside Settings, and we'll handle dunning if a payment fails.",
    tags: ["new"],
    items: [
      "Stripe subscriptions with free / Pro entitlements",
      "14-day free trial on Pro",
      "Automatic dunning emails on invoice.payment_failed",
    ],
  },
  {
    id: "plan-collaboration-and-sharing",
    date: "2026-04-13",
    title: "Plan collaboration, sharing, and progress tracking",
    summary:
      "Share your plan with a manager or mentor, track progress together, and keep everyone aligned without another standup.",
    tags: ["new"],
  },
  {
    id: "mobile-ui-overhaul",
    date: "2026-04-13",
    title: "Mobile UI overhaul",
    summary:
      "A comprehensive pass on the mobile experience — new design primitives, a redesigned Settings page, and a More bottom-sheet for the routes that didn't fit the tab bar.",
    tags: ["improved"],
    items: [
      "New mobile design primitives used across the app",
      "Settings page rebuilt with shared components, ARIA tabs, and proper focus management",
      "'More' bottom-sheet menu for Settings on mobile",
    ],
  },
  {
    id: "toasts-and-plan-gen-progress",
    date: "2026-04-14",
    title: "Toast notifications and step-by-step plan generation",
    summary:
      "Saves, errors, and completions now surface as toasts. While Arcora generates your plan, you'll see what it's working on instead of a silent spinner.",
    tags: ["new", "improved"],
  },
  {
    id: "security-hardening",
    date: "2026-04-14",
    title: "Security and accessibility hardening",
    summary:
      "Defense-in-depth pass: a Content Security Policy, IP-based rate limits on auth and billing endpoints, and WCAG fixes for status indicators that previously relied on color alone.",
    tags: ["new", "fixed"],
    items: [
      "Content-Security-Policy header",
      "IP-based rate limiting on auth and billing API routes",
      "ARIA labels and aria-hidden across interactive and decorative elements",
      "Non-color indicators for velocity and activity status (WCAG 1.4.1)",
      "GitHub Actions CI/CD pipeline with lint, test, and Convex deploy",
    ],
  },
  {
    id: "preboarding-and-warm-landing",
    date: "2026-04-09",
    title: "Pre-boarding wizard and warm landing page",
    summary:
      "A redesigned onboarding wizard with animated steps, interactive goals, and stakeholder entry — plus a warm new landing page with feature sections and live charts.",
    tags: ["new", "improved"],
    items: [
      "Onboarding wizard redesigned with animated steps and a completion overlay",
      "Pre-boarding experience for users who haven't started Day 1 yet",
      "getDayNumber correctly resolves day index in your timezone before plan start",
      "Landing page: warm theme, feature sections, charts, and contrast fixes",
    ],
  },
  {
    id: "security-hardening-for-waitlist",
    date: "2025-12-26",
    title: "Security hardening for waitlist launch",
    summary:
      "Security headers and stronger input validation across the waitlist endpoints ahead of public launch.",
    tags: ["new", "improved"],
  },
  {
    id: "beehiiv-waitlist-and-homepage",
    date: "2025-12-25",
    title: "Beehiiv waitlist and homepage",
    summary:
      "Email capture wired into Beehiiv with UTM tracking, automation IDs on new subscribers, and React Suspense around the Hero so the page paints fast.",
    tags: ["new"],
  },
  {
    id: "initial-arcora-launch",
    date: "2025-12-14",
    title: "Initial Arcora launch",
    summary:
      "First public version of Arcora — custom homepage layout, design system, and the foundations for everything that follows.",
    tags: ["new"],
  },
];

/**
 * Group entries by calendar month, preserving order.
 * Returns: [{ key: 'YYYY-MM', label: 'May 2026', entries: Entry[] }, ...]
 */
export function groupByMonth(entries) {
  const monthFmt = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  });
  const out = [];
  let current = null;
  for (const entry of entries) {
    const key = entry.date.slice(0, 7); // YYYY-MM
    if (!current || current.key !== key) {
      const date = new Date(`${entry.date}T00:00:00Z`);
      current = { key, label: monthFmt.format(date), entries: [] };
      out.push(current);
    }
    current.entries.push(entry);
  }
  return out;
}

/**
 * Format an ISO date as "2 May 2026" (en-GB), matching the LegalLayout convention.
 */
export function formatEntryDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
