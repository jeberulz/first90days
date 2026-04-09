# QA Report — First90 landing (localhost)

**Date:** 2026-04-09  
**URL:** `http://localhost:3002/` (Next dev for this repo; `:3000` was a different project.)  
**Framework:** Next.js 16 (Turbopack)  
**Tier:** Standard  
**Working tree:** Dirty at run time (gstack prefers clean tree for isolated fix commits).

## Summary

| Metric | Value |
|--------|--------|
| Pages exercised | 1 (`/`) |
| Issues found | 4 |
| Fixes applied | 1 (ISSUE-001 contrast) |
| Deferred / info | 3 |

**PR line:** QA on landing: dark-mode body/nav contrast improved (`#A8A29E` → `#D6D3D1` on primary reading); nav/theme/tabs verified; placeholder `#` links and Cursor-only hydration noise called out.

## Console (localhost:3002)

- **React DevTools** suggestion (warning, expected in dev).
- **HMR / Fast Refresh** (warning).
- **Hydration mismatch (debug):** Diff shows `data-cursor-ref` attributes only in Cursor IDE browser snapshots. Not reproduced as an app bug outside automation; treat as **tooling noise**.
- No Chart.js or Iconify runtime errors observed after interactions.

## Interactions verified

- **Dark / light toggle** (navbar): updates theme, focus state OK.
- **FeatureIntelligence tabs** (Intelligence → Market Data): panel swaps to “Market Benchmarks” / compensation copy; tab `active` state OK.
- **Charts:** page loads with mock dashboard; no console errors tied to Chart.js on this pass.

## Issues

### ISSUE-001 — Dark mode: hero and section lead copy too low contrast (accessibility)

- **Severity:** Medium  
- **Category:** Accessibility / Visual  
- **Evidence:** Initial screenshot (dark): hero subhead and similar `text-lg` intros used `dark:text-[#A8A29E]` on `#0F0E0D`.  
- **Fix:** Applied `dark:text-[#D6D3D1]` for hero badge, hero paragraph, secondary CTA, navbar chrome, four feature section intros, CTA blurb in `page.js`.  
- **Files:** `Hero.js`, `Navbar.js`, `FeatureIntelligence.js`, `FeatureManagerSync.js`, `FeatureProgress.js`, `FeatureKnowledge.js`, `page.js`  
- **Fix status:** verified in code (re-check in browser after refresh).

### ISSUE-002 — Navigation and footer links are placeholders (`href="#"`)

- **Severity:** Medium  
- **Category:** Functional / UX  
- **Note:** Methodology / Examples / Pricing / footer columns all point to `#`. Expected for mock landing, but real users get no navigation.  
- **Fix status:** deferred (needs route map or external URLs).

### ISSUE-003 — Footer copyright year

- **Severity:** Low  
- **Category:** Content  
- **Note:** “© 2024 First90 Inc.” while system date is 2026.  
- **Fix status:** deferred.

### ISSUE-004 — Local dev port / lockfile noise

- **Severity:** Info  
- **Category:** Operational  
- **Note:** This repo’s `next dev` held lock on `.next/dev` (PID ~76884) and listened on **3002**; `:3000` served another app. Parent `package-lock.json` triggered Turbopack workspace-root warning.  
- **Fix status:** n/a (document only).

## Health score (approximate)

| Category | Score | Notes |
|----------|-------|--------|
| Console | 85 | Dev-only warnings; hydration debug is Cursor snapshot artifact |
| Links | 70 | All `#` placeholders |
| Visual | 88 | After contrast patch |
| Functional | 85 | Theme + tabs OK |
| UX | 80 | Placeholder links |
| Performance | 90 | Single-page marketing |
| Content | 82 | © year |
| Accessibility | 85 | Contrast patch addresses main find |

**Weighted estimate:** ~83 (before patch ~78).

## Top 3 follow-ups

1. Replace `#` hrefs with real routes or remove until routes exist.  
2. Ship contrast changes with the rest of the redesign in one or more commits (tree was dirty).  
3. Update footer year and re-run quick a11y pass (axe) in both themes.

## Baseline snapshot (`baseline.json`)

```json
{
  "date": "2026-04-09",
  "url": "http://localhost:3002/",
  "healthScore": 83,
  "issues": [
    { "id": "ISSUE-001", "title": "Dark mode lead copy contrast", "severity": "medium", "category": "accessibility" },
    { "id": "ISSUE-002", "title": "Placeholder hash links", "severity": "medium", "category": "functional" },
    { "id": "ISSUE-003", "title": "Footer year 2024", "severity": "low", "category": "content" }
  ]
}
```
