---
date: 2026-05-05
topic: open-ideation
focus: (none — surprise-me)
mode: repo-grounded
---

# Ideation: Arcora — surprise-me run grounded in STRATEGY.md

## Grounding Context

### STRATEGY (verbatim)

- **Target problem:** People starting a new role have no plan that fits their actual role, level, team shape, or company context — so they improvise their ramp. The first 90 days are too high-stakes and compressed for trial-and-error.
- **Approach:** Win by being the lightweight daily ritual that turns a 90-day plan into compounding small actions — beating generic checklists on cadence and adaptability rather than depth on day 1.
- **Tracks:** (1) plan generation quality, (2) daily ritual UX, (3) knowledge & enrichment.
- **Persona:** IC knowledge worker starting a new role at a new company.
- **Metrics:** activation (signup → first plan), D7/D30/D60 retention, phase progression (30 → 60 → 90).

### Codebase context

- Next.js 16 (JS, App Router) + Convex backend + Stripe + Resend + `@convex-dev/rag` + `@convex-dev/auth` + `@convex-dev/workpool`. AI via `@ai-sdk/openai`, `openai`, `@anthropic-ai/sdk`. Iconify, Tailwind, Vitest.
- Public surface: `/`, `/sample/[role]` (static demo plans, recently shipped), `/changelog`, `/p/[slug]` (public plan share), `/(legal)/{terms,privacy}`. Authed surface: `dashboard, plan, today, tasks, progress, log, knowledge, reflect, stakeholders, settings`.
- Pricing: Free (1 plan, 5 enrichments/day, manager share link) and Pro ($29/mo or $23/mo annual; 100 enrichments/day, unlimited regen, PDF + Notion export, 7-day free trial).
- Recent direction: rebrand First90 → Arcora; public sample plans + opt-in plan sharing; public `/changelog`; legal pages; brand-consistent transactional email; mobile + onboarding UX polish.

### Plan-doc reality check (`plan/*.md` = forward-looking specs of what's UNBUILT)

- `plan/02` email infra unbuilt
- `plan/03` daily reminders not firing though `settings.dailyReminderTime` exists
- `plan/07` mobile-nav gaps
- `plan/08` manager-alignment 0% built but promised in marketing
- `plan/11` weekly digest spec'd, unbuilt
- `plan/12` push toggle exists, no service worker / Web Push / permission flow
- `plan/13` `settings.timezone` saved but Today query not tz-aware
- `plan/14` no rate limit on `generatePlan`
- `plan/15` zero PostHog/analytics events
- `plan/17` `generatePlan` no retries, JSON-parse can fail silently, no surfaced errors
- `plan/20` 30/60/90 review pages read-only, no structured reflection form
- Knowledge & enrichment track has **no plan docs** (greenfield)

### External context (web research)

- IC self-serve daily-ritual onboarding is **genuinely unoccupied** — every named competitor (MyCulture.ai, Happily.ai, Disco, Flexos.work, HiBob, BambooHR, Workleap) is HR-procured or one-shot. None surface a daily IC ritual.
- Sunsama / Akiflow at $16-20/mo validate IC pay for explicit "ritual" branding (Sunsama explicitly markets a daily + shutdown ritual; multi-year user retention).
- BetterUp AI Coaching confirms IC appetite for AI-delivered career support; Arcora can occupy the IC-priced version.
- Duolingo *decoupling* insight: streak ≠ daily-goal. Decoupling lifted streak maintenance 10.5% and retention 3.3% — the daily check-in must survive a bad day.
- Medical residency *protect-then-expand*: month 1 deliberately withholds anticipatory tasks; complexity gates unlock on observable readiness, not calendar.
- **Ritual ≠ habit**: guided ceremonies (Sunsama shutdown, Peloton clip-in) build identity-level loyalty that frictionless apps cannot.
- Snapchat mutual streaks → two-sided accountability without unilateral shame.
- Gamification hierarchy (evidence-ranked): progress bars > streaks > variable rewards. All three can coexist if scoped to different time horizons.

### Past learnings

`docs/solutions/` does not exist in this repo. The `plan/` directory holds 21 forward-looking specs (Problem / Current State / Scope) — useful as a record of prior decisions and known gaps, not as post-mortems. After this ideation lands, `/ce-compound` is the right next move to start a real learnings corpus.

---

## Ranked Ideas

### 1. Plan event log as the foundation substrate

**Description:** Build a single append-only event stream (`plan.created`, `task.completed`, `reflection.submitted`, `phase.advanced`, `reminder.fired`, `manager.commented`) as the source of truth for everything time-shaped. Every unbuilt feature on the `plan/` backlog — daily reminders, push, tz-aware Today, weekly digest, structured reflection, manager-alignment, analytics — becomes a thin consumer instead of a from-scratch integration. The architectural choice IS the idea; the foundation fixes are downstream consumers.

**Warrant:** `direct:` `plan/03`, `12`, `13`, `11`, `20`, `08`, `15` are independent forward-looking specs that all need "what happened and when" data. Building seven query paths costs 7×; one log + seven thin consumers costs 1×.

**Rationale:** STRATEGY's daily-ritual approach is currently structurally un-fired (settings exist, nothing fires; Today query is tz-blind; no analytics events). Without an event spine, every retention metric in STRATEGY is unmeasurable and every consumer feature pays a fresh integration cost. With one, the whole `plan/` backlog gets cheaper and operator visibility lights up at once.

**Downsides:** Eats 1-2 weeks of foundational work before any user-visible UI ships. Risks over-engineering if scope creeps to "platform." Has to be enough to support ~7 consumers but not so much it becomes a Kafka-fetish project.

**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

---

### 2. Typed task taxonomy at plan-gen time

**Description:** Replace free-text tasks with a typed taxonomy (`stakeholder_1on1`, `artifact_draft`, `learning_module`, `shipping_milestone`, `feedback_loop`, `beat_check_in`) generated by the AI at plan-gen time. The single decision cascades: ritual UX renders typed icons/flows, RAG retrieves type-specific content, analytics tracks type-mix per phase, manager-alignment gets a shared vocabulary, and benchmarks become comparable across users.

**Warrant:** `direct:` STRATEGY names three tracks — typed tasks are the upstream decision in plan-gen quality that improves all three simultaneously. `external:` newsroom "beat" cadence and clinical SOAP both prove typed structure makes downstream operations feasible at scale.

**Rationale:** Without a taxonomy, each track invents its own ad-hoc categorization and they drift. Typed tasks are also the only way to talk meaningfully about "PMs at day 60 typically have 4 stakeholder_1on1's done" — a cohort signal that's worth nothing if "task" is a string.

**Downsides:** AI prompt becomes more constrained (less creative free-form output). Risk: too many types vs. too few — getting the taxonomy wrong locks in bad cascades. Needs revision discipline as the product learns.

**Confidence:** 80%
**Complexity:** Low-medium
**Status:** Unexplored

---

### 3. Self-tuning living plan — signal- and strain-aware nightly regen

**Description:** Drop the "Regenerate plan" CTA. A nightly Convex cron reads the day's signal — completed/skipped/snoozed tasks, calendar density, reflection sentiment, time spent in app — and silently re-tunes the next 3-7 days, with a visible "what changed" diff in the morning view. Add a Whoop-style cognitive-strain throttle: high-load days surface a recovery ritual (review yesterday + one name); low-load days unlock stretch work. The plan visibly breathes with the user's life. (Merges raw ideas F2#3 + F3#7 + F6#2 + F5#1.)

**Warrant:** `direct:` `plan/17` (no retries / silent failures) and `plan/14` (rate limit) define the envelope this must respect; STRATEGY's "compounding small actions" implies adaptation, not one-shot. `external:` Whoop's strain-coach pattern (recovery score gates next workout) and Duolingo's decoupling insight (streak survives bad days) — load-aware regen is the technical mechanism that makes a 3-min ritual sustainable for 90 days.

**Rationale:** Static plans go stale at week 3 — the canonical onboarding-tool death spiral. Auto-regen converts plan-gen quality from a one-shot into a continuous track, and strain-awareness is what makes "compounding" honest rather than guilt-inducing. The "regenerate" button is itself a confession that the first plan was wrong.

**Downsides:** Heavy on Anthropic spend (nightly inference per active user). Requires #1 (event log) and #2 (taxonomy) to do well. Risk of "plan thrash" if signal is noisy — needs hysteresis. Hard to test deterministically.

**Confidence:** 75%
**Complexity:** Medium-high
**Status:** Unexplored

---

### 4. Compounding reflection layer (replace the read-only review wall)

**Description:** Replace `plan/20`'s read-only review pages with a structured daily reflection — SOAP-style (Subjective / Objective / Assessment / Plan) OR a 20-second voice note transcribed into the same schema for friction-tolerant users. Each entry: 1 person met, 1 system learned, 1 open question, 1 thing for tomorrow. The accumulated reflections become (a) the next morning's "carry-over" item above tasks, (b) the per-user RAG corpus that re-tunes plans (#3), (c) the input to anonymized cross-user benchmarks ("PMs at day 45 typically flag 3 open questions about strategy"). The track that's currently greenfield becomes the data flywheel. (Merges F1#5 + F1#7 + F2#7 + F3#1 + F4#3 + F5#3.)

**Warrant:** `direct:` `plan/20` (review pages read-only) + STRATEGY's note that knowledge & enrichment is greenfield. `external:` clinical SOAP charting (forced schema makes longitudinal patterns legible across shifts) + Duolingo decoupling (the daily check-in must survive a bad day, so the schema must be fast).

**Rationale:** STRATEGY's "compounding small actions" needs an actual mechanism — this is it. Reflections are the only data Arcora can collect that gets monotonically more valuable per user-day, and the reflection corpus is the moat no GPT-wrapper competitor can replicate from a cold start.

**Downsides:** Voice transcription cost. SOAP schema may feel clinical to some users — needs gentle naming. Privacy story for cross-user signal must be airtight. Hardest survivor to make feel human rather than bureaucratic.

**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

---

### 5. Anki for People — spaced-repetition over the org graph

**Description:** Maintain a per-user "People SRS deck" — every coworker the IC mentions or meets becomes a card with name, role, last interaction, and stated priorities. The 3-min ritual surfaces 2-3 cards due for review ("Quick — what does Priya own? When did you last sync?"). Cards graduate from daily → weekly → monthly as recall strengthens; manager can seed high-priority cards ("you'll need Marcus by week 6"). Calendar integration auto-creates cards on every new attendee.

**Warrant:** `external:` Anki/Pimsleur — vocabulary decays exponentially without retrieval practice, and the proven mechanism is scheduled review at the moment of imminent forgetting. `reasoned:` Org context decays the same way; an IC meets 40 people in week 1 and forgets 35 by week 3, exactly when those relationships should be activating. Existing onboarding tools have no answer for this — it's the unique pain.

**Rationale:** Distinguishes Arcora from any plan-template competitor on a defensible axis (people memory). Gives the daily ritual an intrinsically rewarding 30-second moment regardless of whether the user "made plan progress." Compounds with calendar integration as the data source.

**Downsides:** Privacy and consent on coworker data. Risks feeling Black Mirror if too explicit. Requires calendar OAuth (medium-trust ask).

**Confidence:** 70%
**Complexity:** Medium
**Status:** Unexplored

---

### 6. Mutual-streak manager loop (or peer apprentice pair)

**Description:** Add a second human without building a manager dashboard. Manager (or a peer "journeyman" assigned by an Arcora matching engine) gets one weekly email — a generated 4-line summary of the IC's week with one comment box. A shared streak counter ("you and Jamie: 6 weeks of check-ins") lives in both UIs; missing a week pauses, doesn't reset. The IC now has external accountability the product alone cannot generate. Ship the manager variant first (closes `plan/08`'s marketing-promise gap); peer-pair as v2.

**Warrant:** `direct:` `plan/08` manager-alignment is 0% built but promised in marketing. `external:` Snapchat mutual streaks (two-sided accountability without shame) + craft-guild apprentice pairs + the strategy doc's "ritual ≠ habit" finding (a ritual that includes another human is identity-level sticky).

**Rationale:** Solo-product retention curves bend toward zero; two-player retention bends toward steady-state. Adding one human via one weekly email is higher-leverage than any in-product feature. Also resolves the "we promised manager-alignment in marketing but haven't built it" trust debt with a thin, honest version.

**Downsides:** Manager email deliverability + spam concerns. "Streak guilt" risk if a manager misses (mitigated by pause-not-reset). Cold-start: needs IC to invite manager (friction) — defaultable to magic-link copy-paste.

**Confidence:** 80%
**Complexity:** Low-medium
**Status:** Unexplored

---

### 7. Public sample plan library as compounding acquisition asset

**Description:** Today's `/sample/[role]` is private demo content. Extend it into a public, indexable library of anonymized real plans by role × seniority × company-stage (consent-gated at user opt-in), updated as users complete them. Long-tail SEO on "30-60-90 plan for Senior PM at Series B SaaS" with "generate mine" CTA on every page. Show one anonymized reflection excerpt per phase to make the page concrete. Each completed plan becomes a free acquisition asset; CAC declines as the corpus grows.

**Warrant:** `direct:` recent commits already shipped public sample plans (`a6b8c23 feat(growth): public sample plans + opt-in plan sharing`); the infrastructure exists. `direct:` `feat(brand): swap Arcora logo on /sample/[role] header` confirms recent investment in this surface.

**Rationale:** Strategy's only non-track investment area in recent commits — turning the product into the acquisition channel. Compounds with #4 (reflections become page content) and #2 (typed taxonomy = filterable browsing). Low-risk, leverages already-shipped infrastructure.

**Downsides:** Consent model needs care. Quality control on auto-published plans (worst plans become page content too). SEO payoff is slow.

**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

---

## Build-order note

Survivors 1 → 2 → 3 → 4 form a tight foundation chain. Event log unlocks taxonomy → taxonomy unlocks living-plan signal → living-plan + reflection close the compounding loop the strategy promises. 5 / 6 / 7 are parallel-buildable once #1 lands.

---

## Rejection Summary

| # | Idea | Reason rejected |
|---|------|-----------------|
| F1#6 | Timezone roulette fix | Below ambition floor — bug fix, not ideation; folds into #1 |
| F2#1 | Kill the 90-day document | Folded into #3 (the living plan implies a lighter artifact) |
| F2#2 | Auto-drafted intake from JD/LinkedIn | Strong but implementation-shaped — better as brainstorm variant under #3 |
| F2#4 | Stakeholder map from calendar | Folded into #5 (calendar feeds People SRS) |
| F2#5 | Manager-seeded goal-setting | Folded into #6 (manager as entry-point variant) |
| F2#6 | Calendar event auto-locks Today | Too clever; locking the UI is user-hostile and brittle |
| F3#2 | Floating 90-day windows | Promising but a positioning/market question better explored via brainstorm |
| F3#3 | Manager-side mirror product (separate UX) | Folded into #6; standalone manager-side surface is a brainstorm variant |
| F3#4 | Knowledge graph as primary surface | Better as brainstorm variant — pivots product identity, needs a dedicated session |
| F3#5 / F6#3 | $99 one-time pricing flip | Strategic pricing question better suited to a separate GTM brainstorm |
| F3#6 | Cohort-of-strangers free tier | Folded into #4 (cross-user benchmarks come from the reflection corpus) |
| F4#1 | Plan event log | Promoted to #1 |
| F4#2 | Typed task taxonomy | Promoted to #2 |
| F4#3 | Reflection corpus → RAG re-tuning | Folded into #4 |
| F4#4 / F6#7 | Cross-user benchmarks | Folded into #4 (reflection corpus is the data source) |
| F4#5 | Public sample plan library | Promoted to #7 |
| F4#6 | Calendar 1:1 detection | Folded into #5 |
| F5#1 | Whoop strain coach | Folded into #3 (strain throttle inside auto-regen) |
| F5#3 | SOAP-note reflection schema | Folded into #4 (the schema for the reflection layer) |
| F5#4 | Protect-then-expand sandbox | High-build (AI sim infra) — better as brainstorm variant after #1+#2 land |
| F5#5 | Beat reporter cadence | Folded into #2 (`beat_check_in` as a task type) |
| F5#6 | Animal Crossing village | Compelling aesthetic but more brand/UX direction than strategy move; brainstorm variant |
| F6#1 | 30-second one-tap notification | Folded into #3 (morning surface = single notification when plan is auto-tuned) |
| F6#4 | PM-at-Series-A only edition | GTM positioning question better suited to a separate session |
| F6#5 | Manager-bought, IC-used | Folded into #6's manager-loop thesis; full GTM flip is a brainstorm variant |
| F6#6 | Zero-AI curated templates | Interesting forcing question — keep as the "what's the AI worth?" prompt for a future strategy refresh |
