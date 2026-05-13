<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

---

# Arcora — repo guide for AI assistants

Arcora is a Next.js 16 + React 19 web app that generates role-specific 30/60/90-day onboarding plans, with Convex as the realtime backend. The product is documented in `README.md` and `STRATEGY.md`; this file is the engineering map.

## Stack

- **Frontend:** Next.js 16 (App Router, `src/app/`), React 19, JavaScript (no TypeScript in app code), Tailwind CSS 3, Iconify, Chart.js.
- **Backend:** Convex (`convex/`) — queries/mutations/actions, scheduled crons, HTTP actions. Convex installs two `workpool` instances (`embedPool`, `enrichPool`) and `@convex-dev/rag` (see `convex/convex.config.js`).
- **Auth:** `@convex-dev/auth` with the Password provider + Resend OTP for email verification and password reset (`convex/auth.js`, `convex/ResendOTP*.js`).
- **Billing:** Stripe Checkout + Customer Portal + webhook (Convex HTTP action at `/stripe/webhook`).
- **AI:** Anthropic Claude (default) or OpenAI for generation via `AI_PROVIDER`; embeddings always OpenAI `text-embedding-3-small` (pinned — switching means re-embedding everything). Models live in `convex/lib/ai.js`.
- **Email:** Resend for auth + activity reminders.
- **Rate limiting:** Upstash Redis (with in-memory fallback) in the Next.js middleware proxy `src/proxy.js`.
- **Testing:** Vitest with `environment: "edge-runtime"` and `convex-test`.

## Repo layout

```
src/
  app/                       # Next.js App Router
    layout.js                # Root layout: fonts, theme init, providers
    page.js                  # Marketing landing
    (auth)/                  # /login /signup /forgot-password /reset-password /verify-email
    (app)/                   # Authenticated app shell (sidebar, mobile nav, FAB)
      dashboard/  today/  tasks/  plan/  progress/  reflect/
      stakeholders/  knowledge/  log/  settings/
    (legal)/                 # /terms /privacy
    (shared)/                # /shared/[planId] — manager view of an invited plan
    onboarding/              # Multi-step intake wizard (1..6 + completion overlay)
    invite/[token]/          # Accept-invite landing for manager collaborators
    p/[slug]/                # Public read-only plan view
    sample/[role]/           # Marketing role samples
    changelog/               # In-app changelog
    api/
      subscribe/route.js     # Beehiiv waitlist signup
      billing/               # Stripe checkout + portal session creation
    sitemap.js, robots.js, opengraph-image.js
  components/
    ui/                      # Marketing surface (Hero, Mockup, Pricing, ...)
    app/                     # Authenticated shell (AppSidebar, TaskCard, ...)
    onboarding/              # Wizard step components
    plan/                    # Plan view + comments + sharing modal
    stakeholders/            # Stakeholder nudges
    knowledge/               # KB UI (draft review, memory list, search, ...)
    whisperer/               # AI Task Whisperer chat surface
    milestones/              # Phase-completion celebration modal
    settings/                # Settings cards + toggles
    primitives/              # Toast, ErrorBoundary, ResponsiveModal, tabs, ...
    providers/               # ConvexClientProvider, IconifyProvider
  hooks/                     # React hooks (e.g. useHasPlan)
  lib/                       # Pure helpers reused on the client (no Convex calls)
  proxy.js                   # Next.js middleware: per-IP rate limit on /api/auth/* and /api/billing/*

convex/
  schema.js                  # All tables — read this before touching backend logic
  auth.js, auth.config.js    # Convex Auth setup; TERMS_VERSION lives here
  ResendOTP*.js              # OTP email providers
  http.js                    # HTTP router: auth routes + /stripe/webhook
  crons.js                   # Hourly daily-reminders, daily weekly-reflections, daily telemetry reconcile
  convex.config.js           # Installs @convex-dev/rag + two workpools
  ai.js                      # Plan generation (action) — orchestrates Claude prompts
  whisperer.js + whispererInternal.js + whispererTelemetry.js + whispererSemantic.js + whispererThreads.js
  plans.js, planMutations.js, publicPlans.js, planComments.js
  onboarding.js, milestones.js, goals.js, activities.js, stakeholders.js, reflections.js, insights.js
  kb.js, kbInternal.js, kbAutoCapture.js, kbPipeline.js, knowledge.js
  companyResearch.js + companyResearchJobs.js
  collaboration.js           # planInvitations + planCollaborators
  billing.js, billingActions.js, stripeWebhook.js
  notifications.js, emailActions.js, emailChange.js, emailChangeActions.js
  users.js, sessions.js, loginAttempts.js, waitlist.js, logEntries.js, rateLimit.js
  seed.js                    # Pilot/demo plan seeding
  lib/                       # Reusable backend helpers (ai, prompts, validators, rate limit, ...)
  migrations/                # One-off backfills
  _generated/                # DO NOT EDIT — produced by `npx convex dev`
    ai/guidelines.md         # Convex rules; read before backend work

scripts/
  generate-convex-auth-keys.mjs   # One-off JWT_PRIVATE_KEY + JWKS generator
  render-brand-assets.mjs

tests/whisperer/             # Whisperer eval runner + JSON fixtures
docs/                        # brainstorms / ideation / plans / solutions (planning docs only)
.github/workflows/           # CI (lint + vitest + deploy-staging) and Claude Code actions
```

## Path aliases

- `@/*` → `./src/*` (defined in `jsconfig.json`).
- Convex code imports `_generated` via relative paths (e.g. `./_generated/server`, `./_generated/api`). Keep using relative paths inside `convex/`.

## Scripts

```
npm run dev               # next dev (http://localhost:3000)
npm run build             # next build
npm run start             # next start
npm run lint              # eslint (eslint-config-next core-web-vitals)
npm run test              # vitest run (one-shot)
npm run test:watch        # vitest in watch mode
npm run convex:auth-keys  # generate JWT_PRIVATE_KEY + JWKS for Convex Auth
```

There is no `convex` script in `package.json` — run `npx convex dev` directly to develop the backend, and `npx convex deploy` for production. CI runs deploy via `npx convex deploy --cmd 'npm run build'` (see `.github/workflows/ci.yml`).

## Environment

`.env.example` is the source of truth. Required to boot:

- `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_SITE_URL` — Convex deployment URL (same value).
- `NEXT_PUBLIC_APP_URL` — public URL of the Next.js app (used to build Stripe redirects; missing this in prod silently redirects callbacks to localhost).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`.
- `ANTHROPIC_API_KEY` (used when `AI_PROVIDER=claude`, the default).
- `OPENAI_API_KEY` (always required for embeddings).
- `AUTH_RESEND_KEY` — set on **Convex** (`npx convex env set AUTH_RESEND_KEY ...`), not Vercel. Without it auth flows still work but codes log to the Convex console.

Optional: `AI_PROVIDER` (`claude` default | `openai`), `AUTH_EMAIL`, `EMAIL_LOGO_URL`, `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_*`.

Convex HTTP actions are served on `.convex.site`, not `.convex.cloud` — relevant for the Stripe webhook endpoint and any future HTTP handlers.

## Conventions

### File style
- The codebase is JavaScript with ES modules. `jsconfig.json` only defines a path alias — there is no TypeScript anywhere in `src/` or `convex/` (other than the Convex-generated `.d.ts` declaration files).
- `"use client"` at the top of any component that needs hooks/state. Server Components are the default.
- `"use node";` at the top of any Convex action that needs Node APIs (Anthropic SDK, OpenAI SDK, Stripe SDK). V8-runtime Convex functions (queries, mutations, lightweight actions) do not need it.

### Convex
- **Read `convex/_generated/ai/guidelines.md` first.** It overrides training defaults — argument validators, function registration, IDs, indexes, etc.
- Identity is **always** derived from the authenticated session inside the handler. Never trust a caller-supplied `userId` for authorization (`convex/ai.js:51` shows the resolve-via-sibling-query pattern for Node actions that can't import `@convex-dev/auth` directly).
- Tables are user-scoped — every user-owned table has a `by_user` index. When you add a new user-owned table, also add it to `USER_OWNED_TABLES` in `convex/users.js` so account deletion (`purgeUserData`) sweeps it (a missing `by_user` index there has crashed deletion before — see comment on the `weeks` table in `convex/schema.js:184`).
- `convex/_generated/` is regenerated on every `convex dev`. Never hand-edit it. ESLint ignores it (`eslint.config.mjs`).
- Add Convex components via `convex/convex.config.js` — RAG and two workpools (`embedPool`, `enrichPool`) are already wired.
- Cron jobs live in `convex/crons.js` (daily reminders hourly, weekly reflection prompts daily at 17:00 UTC, semantic-event reconciliation daily at 02:00 UTC).
- HTTP routes live in `convex/http.js`. Auth routes are added via `auth.addHttpRoutes(http)`; the Stripe webhook is `POST /stripe/webhook` on `*.convex.site`.

### AI / models
- Generation provider is pluggable: `AI_PROVIDER=claude` (default) or `openai`. Embeddings are pinned to OpenAI `text-embedding-3-small` regardless — switching would require re-embedding every KB doc.
- Model pins live in **one place**: `convex/lib/ai.js` (`CLAUDE_SONNET_MODEL`, `CLAUDE_HAIKU_MODEL`). Update there when bumping models.
- Per-user daily AI cost ceiling is enforced via the `aiUsage` table + `convex/lib/rateLimit.js`. New AI-spending paths must go through it.

### Auth + privacy
- Password policy is server-authoritative in `convex/auth.js` (`validatePasswordRequirements`). The client-side mirror at `src/lib/passwordValidation.js` is for real-time UI feedback only — keep the two in sync.
- `TERMS_VERSION` in `convex/auth.js` is bumped when Terms or Privacy materially change so we can detect users on stale revisions.
- UK GDPR / PECR: signup requires explicit `acceptedTerms`; marketing consent must be explicit opt-in (default false). Both are stamped on the user row at signup time.
- `convex/loginAttempts.js` implements per-email lockout after repeated failed sign-ins.

### Rate limiting
- `src/proxy.js` (Next.js middleware) protects `/api/auth/*` (5/min/IP) and `/api/billing/*` (10/min/IP). Uses Upstash Redis when configured, falls back to an in-memory sliding window otherwise. The matcher in `src/proxy.js:141` defines what's covered.
- Convex-side rate limiting for AI spend is separate, in `convex/lib/rateLimit.js`.

### Plans / route groups
- `(auth)` — unauthenticated forms; their layout is plain.
- `(app)` — gated layout (`src/app/(app)/layout.js`): redirects to `/login` if unauthenticated, to `/onboarding` if no plan, and renders the sidebar + mobile bottom nav + quick-add FAB + phase-completion celebration modal.
- `(shared)` — read-mostly manager view of a plan via an accepted invite.
- `(legal)` — terms / privacy.
- `p/[slug]` is the **public** plan link (opt-in via `plans.publicVisibility`). The slug rotates when the user toggles sharing off then on, invalidating stale links.

### Styling
- Tailwind 3 with a custom brand palette in `tailwind.config.mjs` (`paper`, `warm`, `accent`). Dark mode is class-based and toggled via the `theme-init` inline script in `src/app/layout.js` (reads `localStorage.theme` + `prefers-color-scheme`).
- Fonts: Inter (sans variable), Instrument Serif (display), Space Grotesk (sans default — `font-sans` resolves to it). All loaded via `next/font/google` in the root layout.
- Iconify is loaded once at the app shell via `IconifyProvider`.

### Security headers
- CSP and a full set of security headers are emitted from `next.config.mjs` for every route. `connect-src` covers `https://*.convex.cloud` + `wss://*.convex.cloud` + `https://hooks.stripe.com`. Update the CSP if you add a new third-party origin (fonts, analytics, CDN images).

## Testing

- Runner: Vitest. Config: `vitest.config.js` — `environment: "edge-runtime"`, `convex-test` inlined, and the include glob covers:
  - `convex/**/*.test.{js,ts}`
  - `src/lib/**/*.test.{js,ts}`
  - `src/components/**/*.test.{js,ts}`
- Existing tests live alongside source (e.g. `convex/billing.test.js`, `convex/whisperer.test.js`, `convex/lib/whispererValidator.test.js`, `src/components/whisperer/envelopeFromTurns.test.js`).
- Whisperer evals are in `tests/whisperer/` with a custom `eval-runner.js` and JSON fixtures; they're separate from the standard Vitest suite.
- `npm run lint && npm run test` is what CI runs (see `.github/workflows/ci.yml`).

## CI / deploy

- `.github/workflows/ci.yml` — lint + test on every PR; on push to `main`, also `npx convex deploy --cmd 'npm run build'` using `CONVEX_DEPLOY_KEY`.
- `.github/workflows/claude.yml` and `claude-code-review.yml` — Claude Code GitHub action for `@claude` mentions and PR reviews. Don't disable these without coordinating.

## Working effectively in this repo

- **Backend changes start at `convex/schema.js`.** Most state lives there with detailed inline comments — read the relevant tables before touching `*.js` handlers.
- **Plan generation flow:** onboarding wizard → `convex/onboarding.js` → `convex/ai.generatePlan` (action) → writes phases/weeks/activities/goals → user lands in `(app)` shell.
- **Whisperer (AI task coach) flow:** `convex/whisperer.js` orchestrates, all DB writes go through `convex/whispererInternal.js` mutations. Telemetry is appended to `planEventLog` with the privacy rule that raw prompt/response text never lands there (see header comment on the `planEventLog` table in `convex/schema.js`).
- **Knowledge base flow:** `kbDocuments` → embed pipeline (`kbPipeline.js` + `embedPool`) → optional AI enrichment (`enrichPool`) → `kbMemories` consolidated facts. Company research drafts (`companyResearch.js`) land as `kbDocuments` with `draftStatus: "pending"` and bypass embedding until approved.
- **Don't hand-edit `convex/_generated/`** — it regenerates on `convex dev`. If something is missing from `api.js`, run `convex dev` rather than typing it in.
- **Match the existing JS style:** ES modules, no TypeScript, no Prettier config (follow surrounding indentation). Comments explain *why* (constraints, gotchas, GDPR rationale) — keep that habit.
- **Pre-existing Convex agent skills** are symlinked into `.claude/skills/` (convex-quickstart, convex-setup-auth, convex-create-component, convex-migration-helper, convex-performance-audit). Invoke them via Skill when relevant.

## Things that have bitten us (do not re-introduce)

- Missing `by_user` index on a user-owned table → `users.purgeUserData` crashes on first deletion attempt.
- Trusting a caller-supplied `userId` for auth instead of resolving via `ctx.auth` → privilege escalation. Use the pattern in `convex/ai.js:51`.
- Reading `viewer` before it materializes after sign-in → `TypeError` and a generic Next.js client-side exception. Treat `viewer === null` as still loading (see `src/app/onboarding/page.js:18`).
- Forgetting `NEXT_PUBLIC_APP_URL` in production → Stripe redirects silently go to `localhost:3000` and subscriptions appear to hang.
- Setting `STRIPE_WEBHOOK_SECRET` on Vercel instead of Convex → webhook signature verification fails because the endpoint is served from `*.convex.site`.
- Editing `convex/_generated/` by hand → next `convex dev` blows it away.
