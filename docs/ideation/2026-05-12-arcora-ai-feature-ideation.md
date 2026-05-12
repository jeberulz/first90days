---
date: 2026-05-12
topic: arcora-ai-feature
focus: AI feature woven into Arcora — make v1 whisperer compound, become a moat, connect to May 2026 ideation survivors
mode: repo-grounded
---

# Ideation: Arcora AI Feature — Compounding, Moat, and Risk Frames Around v1 Whisperer

## Grounding Context

### STRATEGY (verbatim from STRATEGY.md)

- **Target problem:** People starting a new role have no plan that fits their actual role, level, team shape, or company context — so they improvise their ramp. The first 90 days are too high-stakes and compressed for trial-and-error.
- **Approach:** Win by being the lightweight daily ritual that turns a 90-day plan into compounding small actions — beating generic checklists on cadence and adaptability rather than depth on day 1.
- **Tracks:** (1) plan generation quality, (2) daily ritual UX, (3) knowledge & enrichment.
- **Persona:** IC knowledge worker starting a new role (PM, designer, engineer, marketer, ops).
- **Metrics:** activation (signup → first plan), D7/D30/D60 retention, phase progression (30 → 60 → 90).

### Confirmed v1 scope (from preceding `ce-brainstorm` Phase 2.5)

- Per-task "help with this" AI whisperer inside the 3-min daily ritual
- Triggered on each task in Today and Tasks views
- One-shot structured answer (hybrid coaching + drafted artifact when artifact-shaped) with an expand-to-chat option scoped to the task
- Context: task + role/level + plan phase + adjacent tasks + goals + named stakeholders + recent reflections
- AI stack: existing Anthropic + OpenAI + `@convex-dev/rag`; chat saved per-task; no cross-task long-term memory in v1; reuses Pro/Free quota model

**Confirmed roadmap (priority order):** morning brief synthesizer, reflection partner, plan negotiator, always-available copilot, moment-of-need coach, ambient intelligence layer.

### Codebase context (Arcora-specific topography)

- **Plan generation:** `convex/ai.js:generatePlan` (dual Claude/GPT via `convex/lib/ai.js:generateText()`); per-phase try-catch with console.error fallback to static template via `savePlanFallback()`. **No retries; silent JSON parse failures** (plan/17 backlog).
- **RAG retrieval (direct whisperer hook):** `convex/lib/kbContext.js:fetchContextForPlanning(ctx, {userId, query, categories[], topK, includeMemories})` → returns `{contextText, citations[], memories[], tokensEstimate}`. RAG is namespaced per user.
- **KB pipeline:** `convex/kbPipeline.js` orchestrates 8 parallel embed + 2 parallel enrich via Workpool. `kbEnrichmentJobs` table.
- **Activities (tasks):** `convex/schema.js:activities` — **free-text category string, no typed enum**. Hardcoded categories "learning, shipping, relationships, influence" live in prompt text (WATKINS_SYSTEM_PROMPT in `convex/lib/planPrompts.js`).
- **Stakeholders + goals + reflections:** `convex/stakeholders.js` (health + nudge urgency + cadence), `convex/goals.js` (targetPhase, approval workflow), `convex/reflections.js` (dailyReflections, weeklyReviews with async `aiSummary`).
- **Rate limit:** `convex/lib/rateLimit.js` — per-user per-UTC-day ceiling (free=$2/day, pro=$15/day); generatePlan=100¢, suggestActivities=30¢, kbEnrich=20¢. Mature infra, extendable.
- **Audit pattern:** `recordRetrieval()` in `convex/lib/kbContext.js` already logs feature + doc IDs per AI surface.
- **Notable absences:** no first-class plan event log table (only manual `logEntries`), no `@convex-dev/agent` component installed, `enrichmentBudgetUsedToday` field exists in user settings but unused.
- **Pain backlog:** plan/03 reminders not firing despite `settings.dailyReminderTime`; plan/13 Today query not tz-aware despite `settings.timezone`; plan/15 zero analytics events; plan/17 generatePlan no retries / silent JSON failures; plan/20 30/60/90 reviews read-only.

### May 2026 ideation survivors (from docs/ideation/2026-05-05-open-ideation.md)

1. **Plan event log as foundation substrate** (90%, medium)
2. **Typed task taxonomy at plan-gen time** (80%, low-medium)
3. **Self-tuning living plan — signal/strain-aware nightly regen** (75%, medium-high)
4. **Compounding reflection layer (SOAP-style)** (85%, medium)
5. **People SRS — spaced-repetition over org graph** (70%, medium)
6. **Mutual-streak manager loop** (80%, low-medium)
7. **Public sample plan library** (85%, low)

### External context (web research)

- **Granola @ $1.5B (Feb 2026):** direct architectural ancestor — Spaces (query a corpus of meetings) + MCP (passive context injection into Claude/Cursor). Their stated next move: all transcripts as AI memory.
- **WHOOP Coach memory (launched May 2026):** user-supplied context layer (goals, injuries, routines) added by text/voice. "The more data a member shares, the more effective and pointed WHOOP Coach becomes." Coaching output always anchored to a data artifact, never free-floating advice.
- **Duolingo Birdbrain:** per-interaction knowledge-state update — each exercise votes on a probability distribution over skill states; next session's content drawn from that distribution.
- **Sunsama:** explicitly refuses to automate the planning ritual — AI generates an end-of-day shutdown wrap but does NOT replace the human-paced morning walkthrough. AI at the ritual boundary, not inside it.
- **Stoic app:** preserves ritual integrity by giving prompts within a time-boxed frame; never open-ended chat.
- **Reflectly:** prompts don't adapt to accumulated history; users outgrow the app in 2-3 months.
- **Notion AI v3 agents (Sept 2025):** autonomous executors that pull users out of ritual; anti-pattern for habit-anchored products.
- **Bessemer Jan 2026 + cusp.services + sshh.io postmortems:** thin AI wrappers are dead. Vertical AI moat = (1) interaction data as proprietary training signal, (2) workflow embedding as switching cost, (3) role-specific eval suites, (4) longitudinal context depth, (5) data gravity via visible accumulation.

### AI failure modes to design against

- Generic re-explanation tax (Notion AI early)
- Ritual displacement into chat thread
- Episodic memory / "meeting a stranger" (Reflectly's death)
- Engagement metric optimization over artifact quality
- Context overhead exceeding task size on small tasks

---

## Ranked Ideas

### 1. Whisperer-as-Event-Emitter

**Description:** Every whisperer turn emits typed events into the plan event log: `stuck_signaled`, `blocker_named`, `stakeholder_referenced`, `task_reframed`, `commitment_made`. The chat UI stays the same; the substrate underneath becomes the canonical signal stream. Folds in stakeholder-resolution cache — every @-mention or named role resolves to a stakeholder entity and accumulates facts (comm preference, recurring blockers, sentiment trend).

**Warrant:** `direct:` May 2026 ideation survivor #1 (plan event log as foundation substrate, 90% confidence). `reasoned:` Composition with confirmed v1 — without this, v1 is a stateless silo; with it, every later AI feature (self-tuning regen, role-eval suites, cohort intelligence, People SRS) is a thin consumer of one schema.

**Rationale:** Single highest-leverage move in the batch. Converts v1 from "ChatGPT-with-context-window" into the highest-bandwidth signal source Arcora owns. Granola's $1.5B is essentially this pattern applied to meetings — Arcora applies it to tasks + reflections + chat. Makes every May 2026 survivor cheaper to build.

**Downsides:** Schema design upfront — 1-2 weeks of substrate before user-visible payoff. Over-engineering risk (could creep to "platform"). Requires retrofitting existing surfaces (plan edits, task completions) to emit events too.

**Confidence:** 90% | **Complexity:** Medium | **Status:** Unexplored

---

### 2. Auto-distilled SOAP + Therapist Opener

**Description:** When a task closes (done, skipped, rescheduled, abandoned), a cheap LLM pass distills the whisperer transcript into Subjective/Objective/Assessment/Plan attached to task/role/phase/stakeholders mentioned. Reflection corpus grows passively, with zero new journaling UX. Each next ritual opens by surfacing yesterday's unresolved thread as continuation — "last time you were stuck on framing the migration tradeoff to Priya. Did that go anywhere?"

**Warrant:** `external:` Reflectly's "outgrown in 2-3 months" failure traced to episodic prompts that don't accumulate. Clinical SOAP charting + therapist between-session homework as continuity patterns. `direct:` May 2026 survivor #4 (compounding reflection layer, 85% confidence).

**Rationale:** Solves the "AI feels like meeting a stranger" failure mode. The continuity feel — referencing week-2 reflections in week 6 — is the moat that generic AI tools structurally can't match without owning the corpus. Compounds: by week 6, the AI is anchored in week-2 reflections in a way no fresh tool can replicate.

**Downsides:** Distillation costs per task; users may feel monitored. SOAP frame needs gentle naming so it doesn't feel clinical. Cold-start: low value before day 5.

**Confidence:** 85% | **Complexity:** Medium | **Status:** Unexplored

---

### 3. Stuck-Pattern Taxonomy from Whisperer Traffic

**Description:** Cluster whisperer transcripts weekly by stuck-reason ("ambiguous stakeholder ask," "no decision-maker identified," "scope creep," "skill gap," "political risk"). Promote recurring clusters into the activity-category typed taxonomy. Plan-gen for cohort N+1 produces tasks pre-tagged with likely failure modes + the whisperer prompt that worked last time. Bootstrap via one-time LLM-proposed taxonomy migration over existing free-text activity categories.

**Warrant:** `external:` Bessemer Jan 2026 — "interaction data as proprietary training signal" ranked #1 defensibility pattern. Duolingo Birdbrain applied to task taxonomy. `direct:` May 2026 survivor #2 (typed task taxonomy, 80% confidence) + plan/15 zero analytics gap.

**Rationale:** Taxonomy isn't a designer's guess — it's learned from real failure modes. Each user's stuck moment makes the next user's plan smarter at generation time. ChatGPT cannot see the distribution of stuck-reasons across 10,000 PMs in their first 30 days. Single decision (taxonomy structure) cascades through three Arcora tracks (plan-gen quality, daily ritual, knowledge/enrichment).

**Downsides:** Schema migration; clustering quality control; could drift if not curated. Requires meaningful whisperer traffic (~weeks 4-6 before useful signal).

**Confidence:** 80% | **Complexity:** Medium | **Status:** Unexplored

---

### 4. Writable 30/60/90 Reviews + Self-Tuning Plan Diff

**Description:** Replace plan/20's read-only review pages. Review pages ingest 30-day event log + reflections + whisperer transcripts and produce a *writable* plan diff (add stakeholder, retire dead task, escalate phase, surface new risk). User sees the plan visibly get smarter on day 30 than day 3.

**Warrant:** `direct:` plan/20 (review pages read-only) + May 2026 survivors #3 (self-tuning living plan, 75%) + #4 (compounding reflection, 85%). M&M-conference structured-failure-review framing.

**Rationale:** This is where the compound moat becomes legible to the user. Without it, accumulation is invisible — equivalent to ChatGPT memory the user can't see. Reflectly's specific death. Phase boundaries are also the natural "graduation" moment that makes D60/D90 retention have a narrative reason.

**Downsides:** Plan-thrash risk if signal is noisy — needs hysteresis. Convex transactional integrity on diff-apply. Won't feel valuable before week 4. AI-driven plan rewrites need an undo escape hatch.

**Confidence:** 85% | **Complexity:** Medium-High | **Status:** Unexplored

---

### 5. Calendar as Context

**Description:** Read-only Google/Outlook calendar integration. The whisperer becomes time-anchored: "your 1:1 with Priya is at 3pm — given where you are in phase 2, here's the one thing to bring up." Stakeholder coverage gaps become visible (haven't met half your named stakeholders). Unlocks the roadmap moment-of-need coach for free — the AI knows exactly when need fires.

**Warrant:** `external:` Granola @ $1.5B (Feb 2026) — "calendar + meetings as the substrate" is their architectural foundation. WHOOP Coach (May 2026) user-context-layer pattern. `direct:` Compounds with People SRS (May survivor #5) and event log (which meetings actually moved tasks forward).

**Rationale:** Calendar is the single largest context source v1 ignores. It's also irreplaceable longitudinal context — no prompt-engineering competitor can fake calendar history. Highest-leverage missing context piece.

**Downsides:** OAuth permission ask is a trust hurdle. Privacy carefulness. Doesn't help users without managed calendars (some early-stage / freelance ICs).

**Confidence:** 80% | **Complexity:** Medium | **Status:** Unexplored

---

### 6. Negative-Signal Vault + Draft Partner

**Description:** Whisperer output is two-column by default: best guess + assumptions to challenge. When the user abandons a chat, switches topic mid-thread, gives a thumbs-down, or marks a task done immediately after one whisperer turn with no apparent resolution — log it as a labeled negative example with the full context window. Internal eval set where the bar isn't "did the model answer" but "did the user keep going" / "did the artifact ship."

**Warrant:** `external:` Bessemer Jan 2026 — interaction data as proprietary training signal is rated #1 defensibility pattern. Mirrors Cursor/Copilot's accept-rate metric. `reasoned:` Artifact-quality metric beats engagement metric (avoids Notion AI's pseudo-productivity trap).

**Rationale:** Cleanest moat play in the batch. Generic AI can't see Arcora's failures. Also: makes prompt iteration principled — right now no one knows if a whisperer change made things better or worse. Foundation for role-specific eval suites + future fine-tuning if corpus grows.

**Downsides:** "Challenge these assumptions" UX needs care so AI doesn't seem to dodge responsibility. Eval set takes weeks to populate meaningfully. Negative-signal logging needs privacy clarity.

**Confidence:** 80% | **Complexity:** Medium | **Status:** Unexplored

---

### 7. Manager Loop via Commander's Intent + Whisperer Handoff

**Description:** At week 1, the user's manager authors structured intent — the why, end-state, success criteria — one input refined quarterly. Every whisperer turn checks the user's move against this intent, not against generic best practice. When stuck-cluster = "needs manager input" (decision authority, scope clarification, prioritization), a one-tap "summarize for my manager" produces a Slack/email-ready ask with full context. If the manager is on Arcora (mutual-streak), it lands as a structured request in their inbox; if not, the polished message exposes them to Arcora.

**Warrant:** `direct:` plan/08 (manager-alignment is 0% built but promised in marketing) + May 2026 survivor #6 (mutual-streak manager loop, 80% confidence). `external:` Military mission command (commander's intent + AAR).

**Rationale:** Closes the marketing-promise trust debt with a thin honest version. Solves managing-up under uncertainty — the real first-90-days pain that task help alone can't touch. Each handoff summary is a marketing artifact the manager sees with Arcora's name on it. Two-sided retention beats solo retention.

**Downsides:** Manager activation flow adds friction. Email deliverability. "Intent" is heavy framing — needs gentle naming (maybe "manager brief" or "shared expectations"). Risk of feeling surveilled.

**Confidence:** 75% | **Complexity:** Medium | **Status:** Unexplored

---

### 8. Public Library from Anonymized Whisperer Wins

**Description:** Cleanly-resolved whisperer chats (task completed within 48h, no negative signal, user opt-in) → LLM PII redaction → publish to a public gallery indexed by role × phase × stuck-pattern. Strangers searching "Week 3, Senior PM, stakeholder alignment" land on real (anonymized) examples and convert via "generate mine" CTA. Each completed plan becomes a free acquisition asset.

**Warrant:** `direct:` May 2026 survivor #7 (public sample library, 85%) + recently-shipped `/sample/[role]` infrastructure (`a6b8c23 feat(growth): public sample plans + opt-in plan sharing`). `external:` Granola Spaces template-ecosystem pattern.

**Rationale:** Turns whisperer interaction volume into CAC reduction curve. Compounds with #3 (typed taxonomy enables filterable browsing) and #2 (reflections become legible page content). Long-tail SEO covers role/phase combinations editors can't hand-author.

**Downsides:** Consent model needs care. Quality control on auto-published examples (bad whisperer outputs would become page content too). SEO payoff is slow. PII redaction reliability.

**Confidence:** 75% | **Complexity:** Medium | **Status:** Unexplored

---

## V1-Anchor Challenger (surfaced for user awareness)

**1-Engineer Cut: Curated Playbook Library + Chooser** — Ship ~200 hand-curated role-specific stuck-task playbooks. Whisperer's job is retrieval + light personalization, not generation. No RAG, no multi-model, no chat. The AI is *retrieval + light personalization*, not *generation*. Compounding moat is the playbook library (hand-curated, role-specific, ties to survivor #8). Defensible because playbook quality compounds with editorial work, not just compute. Ships in weeks, not months.

This is a real fork from the v1 the user chose (LLM-driven hybrid coaching + drafted artifact). The user's v1 wins on personalization depth and the "assistant feel" they explicitly wanted; this alternative wins on speed, cost, and content moat. **Could also be staged: ship this as v1, evolve toward LLM generation as the corpus grows.** Worth knowing about even if not adopted.

---

## Prerequisites — Must-Fix Infra Before v1 Scales

These are pre-AI plumbing issues surfaced by the pain-and-friction frame. None are flashy; all are load-bearing.

- **Plan repair / retries on `generatePlan`** — plan/17. Silent JSON parse failures on day-1 plans = activation cliff before ritual ever starts compounding.
- **Timezone correctness** — plan/03 (daily reminders not firing despite `settings.dailyReminderTime`) + plan/13 (Today query ignores `settings.timezone`). AI features layered on top inherit the broken cadence; D7 retention is gated on the ritual firing at local 8am, not UTC.
- **AI telemetry spine** — plan/15 (zero analytics). Define `invoke`, `accept`, `edit`, `discard`, `re-invoke-same-task`, `time-to-artifact` events before v1 ships. Without these, every AI iteration is vibes; the Notion-AI engagement-metric trap is unavoidable.
- **Task-size classifier** — cheap heuristic (no LLM call) that routes small tasks (~5 min) to a 2-line tip without full hybrid coaching + chat. Prevents the "AI lectures you about sending a Slack message" failure where context overhead exceeds task size.

---

## Risks to Design Against

| Risk | Source | Mitigation in survivors |
|------|--------|------------------------|
| Ritual displacement (chat eats the 3-min ritual) | Sunsama / Stoic / Reflectly reviews | Survivor #1 emits events so chat is instrumented; task-size classifier prerequisite caps chat surface |
| Generic re-explanation tax | Notion AI early | Survivors #1 (event emission) + #5 (calendar pre-loads context); user never re-explains |
| Episodic memory / "meeting a stranger" | Reflectly | Survivors #1 (event log) + #2 (SOAP corpus + therapist opener) |
| Engagement metric optimization over artifact quality | sshh.io / Notion AI | Survivor #6 grades success as artifact accepted, not chat opened |
| Context overhead > task size on small tasks | sshh.io granularity-mismatch | Task-size classifier (prerequisite) |
| AI-as-crutch (anti-Stockfish) | Reasoned | Design hook only; deliberate forgetting at phase boundaries is the v2+ pattern to consider |

---

## Build-Order Note

Survivors **1 → 6 → 2 → 3 → 4** form a tight foundation chain:

- **#1 Event emitter** is the substrate everything else consumes
- **#6 Negative-signal vault** is the eval infrastructure that makes the others measurable (must land before/with v1, or every prompt change is faith-based)
- **#2 SOAP distillation** + **#3 Stuck-pattern taxonomy** are the compounding consumers of the event log
- **#4 Writable reviews** is where compounding becomes legible to the user (phase-boundary visible payoff)

**#5 Calendar** and **#7 Manager Loop** are parallel-buildable once #1 lands (they're context-source and second-user extensions).

**#8 Public Library** is downstream of #3 (typed taxonomy makes filtering/SEO clean) — naturally lands ~30 days after meaningful whisperer traffic.

---

## Rejection Summary

| # | Idea | Reason rejected |
|---|------|-----------------|
| F1#1 | Plan Repair Mode | Promoted to Prerequisites — pre-AI reliability infra |
| F1#2 | Context-Tax Audit | Subsumed by survivor #1 (event emitter captures context misses as events) |
| F1#3 | Timezone Fix | Promoted to Prerequisites |
| F1#4 | Overnight Mise en Place via Budget Field | Tactical latency polish; valuable v1.1 candidate but lower leverage than the 8 survivors |
| F1#6 | AI-Assisted Typed Taxonomy Migration | Folded into survivor #3 as bootstrap step |
| F1#7 | AI Telemetry Spine | Promoted to Prerequisites |
| F1#8 | Task-size Classifier | Promoted to Prerequisites (v1 guardrail) |
| F1#9 | Plan Event Log = AI Memory Substrate | Duplicates May survivor #1; survivor #1 (event emitter) is the operationalization |
| F2#1 | Silent Eval (no UI) | V1-anchor replacement — rejected because user chose user-facing whisperer |
| F2#2 | Onboard the AI, Not the User | Brainstorm variant — interesting but v1 has explicit context model |
| F2#3 | Deliberate Forgetting at Phase Boundaries | Brainstorm variant — too extreme for v1; surfaced as v2+ anti-crutch pattern |
| F2#4 | AI Talks to Manager Not User | Too extreme inversion; survivor #7 captures the manager loop pragmatically |
| F2#5 | AI Failures Are the Ritual | Folded into survivor #6 (draft-partner with assumptions to challenge) |
| F2#6 | Remove Chat, Replace with Diff View | Contradicts confirmed v1 (expandable chat) — v2 plan-negotiator pattern |
| F2#7 | AI Helps Cadence Not Task | Strategic alternative; user chose task help; addressed via roadmap items |
| F2#8 | Auto-Share Artifact | Too aggressive for v1; agentic-execution roadmap |
| F3#1 | Manager Mirror (silent parallel plan) | More ambitious than survivor #7; v2 manager-product extension |
| F3#2 | Interruption Budget | Roadmap UX primitive for always-available copilot phase |
| F3#4 | 30-Second Product / 10 micro-moments | Contradicts confirmed 3-min ritual; roadmap for ambient layer |
| F3#5 | Cohort Brain | Folded into survivor #3 (taxonomy from whisperer traffic) |
| F3#6 | No-LLM AI Layer | Strong moat play but architectural roadmap; partially captured in prerequisite classifier |
| F3#7 | Plan as Event Log Execution AI | Duplicates survivors #1 + #4 reframing |
| F3#8 | First 90 Days of Every Transition | Brainstorm variant — product-extension business question |
| F4#5 | Stakeholder Resolution Cache | Folded into survivor #1 (stakeholder_referenced event type) |
| F4#8 | Versioned Snapshot Context | Folded into survivor #6 (replay-eval primitive lives in negative-signal vault infra) |
| F5#1 | Black Box Onboarding (FDR) | Aviation analogy framing for survivor #1 |
| F5#2 | Mise en Place Whisperer | Folded into F1#4 (v1.1 candidate) |
| F5#3 | Beat Reporter Editor | Useful prompt-design framing for v1; not standalone idea |
| F5#4 | M&M Conference | Folded into survivor #4 (phase-end writable review) |
| F5#5 | Strip Handoff Between AI Surfaces | Architectural primitive; surface when roadmap items get planned |
| F5#6 | Journeyman Piece Portfolio | Reframing of survivor #8; nice product narrative for day 91 |
| F5#7 | Commander's Intent + AAR | Folded into survivor #7 |
| F5#8 | Therapist Between-Session Homework | Folded into survivor #2 |
| F6#1 | Overnight Oracle ($100/user/day) | Ambitious extension of F1#4; not v1 |
| F6#2 | 30-Second Ritual time-flip | V1-anchor replacement |
| F6#3 | Zero-Intake Cold Start | Activation-funnel feature; different surface than whisperer |
| F6#4 | 100-User Cohort Mirror | User-facing surface of survivor #3; emerges once cohort signal exists |
| F6#5 | 50%-Accurate Draft Partner | Folded into survivor #6 |
| F6#6 | Earbud Whisperer | Modality roadmap (v3+); ambient layer |
| F6#7 | 1-Engineer Cut Playbook Library | **Surfaced as v1-anchor challenger** for user awareness |
| F6#8 | Trust-Zero Local Whisperer | Privacy-wedge brainstorm variant |
| X1-X5 | Cross-cuts | Integrated into survivors #1-3 rationales |
