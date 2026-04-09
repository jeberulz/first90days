# QA Report — First90Days

- **Date:** 2026-04-09
- **URL:** http://localhost:3002
- **Branch:** main
- **Tier:** Standard (browser smoke + changed-area focus)
- **Auth:** Existing session (iseghohi.john@gmail.com)
- **Duration:** ~10 min

## gstack policy note

**Working tree was dirty** (6 modified files: `convex/seed.js`, `convex/users.js`, dashboard/plan/tasks/today pages). Full /qa fix-loop with one-commit-per-fix expects a clean tree first.

## Pages exercised

| Route | Result |
|-------|--------|
| `/dashboard` | Loads: journey strip, day counter, goals, stakeholders, pilot Reset workspace |
| `/today` | Loads: Day 1 header, 2 activities, progress 0/2, reflection CTA |
| `/plan` | Loads: 59 activities / 12 weeks, week links, phase headers |
| `/tasks` | Loads: filters, 59 upcoming, goals section |

## Console (aggregate)

- **Next.js dev:** `Detected scroll-behavior: smooth on <html>` — suggest adding `data-scroll-behavior="smooth"` per Next docs (noise, not user-visible break).
- **Fast Refresh:** occasional “unrecoverable error” then rebuild — dev-only churn.
- No app-throwing React error boundaries observed on the tested pages after load.

## Findings

### ISSUE-001 — Reset control obscured by FAB (Low / UX)

- **Where:** `/dashboard`, pilot “Reset workspace” row, narrow/mobile width.
- **Symptom:** Orange “+” FAB overlaps the secondary button; label truncates (“Reset & re-s…”).
- **Severity:** Low (desktop likely fine; pilot-only control).
- **Fix status:** deferred (not Standard-tier blocker).

### ISSUE-002 — Pre-boarding flow not exercised (Coverage gap)

- **Where:** Dashboard / Today / Plan / Tasks pre-start UI.
- **Reason:** Local Convex data + `startDate` for this user yields **Day 1 / `hasStarted: true`**, so countdown, T-minus Today, and pre-start banners did not appear.
- **Severity:** N/A (test gap, not necessarily a code bug).
- **Recommendation:** Re-test with `onboardingData.startDate` in the future (or pilot reset after setting May 11, 2026 in DB / fresh seed).

## Health score (rough)

- **Functional:** high for core navigation and lists (~90)
- **Console:** docked for Next scroll warning (~75)
- **Overall (informal):** ~**85/100** for this smoke pass

## PR-style one-liner

> QA (localhost:3002): dashboard, today, plan, tasks load for pilot session; no critical regressions; mobile FAB overlaps reset button; pre-boarding states need a future start date to verify.

## Status

**DONE_WITH_CONCERNS**

- Concerns: dirty git tree; pre-boarding UX unverified; ISSUE-001 deferred.
