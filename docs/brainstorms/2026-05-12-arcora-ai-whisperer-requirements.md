---
date: 2026-05-12
topic: arcora-ai-whisperer
---

# Arcora AI Task Whisperer — v1 Requirements

## Summary

Add a per-task AI "help me with this" companion inside Arcora's 3-min daily ritual. When a user taps the affordance on any task in Today or Tasks, the whisperer returns a hybrid response — a brief coaching summary plus a drafted artifact when the task is artifact-shaped — with an optional "keep going" expand into a chat thread scoped to that task. The whisperer reads the user's role/level, plan phase, adjacent tasks, goals, named stakeholders, and recent reflections; it does not maintain cross-task long-term memory in v1. Every interaction emits typed events into a new plan event log substrate so future AI features (self-tuning regen, cohort taxonomy, role-eval suites) ship as thin consumers rather than from-scratch integrations.

---

## Problem Frame

Arcora's daily ritual produces tasks, but tasks regularly stall in the user's actual workday. An IC stares at "Draft a 1:1 agenda for Marcus" or "Send an intro to the platform team" and either skips it, drops to ChatGPT and re-explains their full context from scratch, or hand-rolls a poor first try. The 3-min ritual is too short to coach through individual stuck moments; the user already has all the right context inside Arcora — role, level, phase, named stakeholders, recent reflections — but Arcora cannot currently produce anything from that context beyond static plan content.

The cost compounds. By week 3, a user has either learned to live with the gap (their ramp slows; they outgrow the product) or routed around it (their context lives in ChatGPT threads Arcora cannot see; the daily ritual becomes a checkbox). Reflectly, Notion AI's early sidebar, and the wider 2025-2026 AI-wrapper retention literature all show this same death spiral: AI tools that don't compound over weeks lose to generic alternatives by month two. Arcora's defensible position — already holding the role + plan + people graph — is squandered if the user has to leave the product to act on it.

---

## Actors

- A1. **IC user** (PM, designer, engineer, marketer, ops starting a new role): primary actor; invokes the whisperer on stuck tasks during the daily ritual or ad-hoc through the workday.
- A2. **Manager** (the IC's reporting manager): not interactive in v1; referenced indirectly when the whisperer drafts manager-facing artifacts (1:1 agendas, status notes). Becomes interactive in roadmap v2 manager-loop handoff.
- A3. **Whisperer system** (AI feature + its substrate): produces responses, persists scoped chat threads, emits typed events into the plan event log.

---

## Key Flows

- F1. **Stuck-task whisperer — one-shot path**
  - **Trigger:** A1 taps "help with this" on any task card in Today or Tasks
  - **Actors:** A1, A3
  - **Steps:**
    1. A3 assembles context bundle: task + role/level + plan phase + this week's adjacent tasks + linked goal + linked stakeholders + 3 most recent daily reflections
    2. A3 routes via task-size classifier; small tasks get a 2-line tip path, all others get the full hybrid path
    3. A3 classifies whether the task is artifact-shaped (1:1 agenda, intro Slack message, doc outline, learning summary)
    4. A3 returns hybrid response: 2-3 line coaching summary + drafted artifact when artifact-shaped + an "assumptions I made" block the user can correct
    5. A3 emits `whisperer_invoked` event into the plan event log (non-blocking)
  - **Outcome:** A1 has a response they can immediately use, copy, edit, or correct
  - **Escape paths:**
    - When task is too vague or context is too thin, A3 asks one clarifying question instead of producing a generic answer
    - When A3 cannot reach the AI provider, A3 surfaces a task-type-based tip fallback rather than a silent error

- F2. **Expand-to-chat — continuation path**
  - **Trigger:** A1 taps "keep going" or equivalent on a one-shot response
  - **Actors:** A1, A3
  - **Steps:**
    1. The one-shot response expands into a chat thread scoped to this task only
    2. Thread is persistent; reopening the same task later restores the thread
    3. Each turn carries the F1 context bundle plus the thread's turn history
    4. Each turn emits typed semantic events (`stuck_signaled`, `blocker_named`, `stakeholder_referenced`, `task_reframed`, `commitment_made`) into the plan event log
  - **Outcome:** A1 iterates until satisfied, or marks the task done/skipped

- F3. **Quota and rate-limit enforcement — system path**
  - **Trigger:** Any whisperer invocation (F1 or F2)
  - **Actors:** A3
  - **Steps:**
    1. A3 pre-flight-reserves cost against the existing per-user daily ceiling via `convex/lib/rateLimit.js`
    2. Free tier: capped at N whisperer invocations/day; Pro tier: capped at higher N/day
    3. On ceiling reached, A3 throws a typed error with a user-facing message and (for Free) an upgrade CTA
  - **Outcome:** Costs are bounded; quota state is visible to the user

---

## Requirements

**Trigger and surface**
- R1. The whisperer is triggered from a per-task affordance ("help with this" or equivalent) visible by default on each task card in Today and Tasks views — not hidden behind hover or menu, not exposed as a global sidebar or command palette in v1.

**Context the whisperer sees**
- R2. Each invocation receives: the task (title + description + category + completion notes if any), the user's role and level, the user's current plan phase (30/60/90), this week's adjacent tasks, any goal linked to the task, any stakeholder linked to the task, and the 3 most recent daily reflections.
- R3. When the task is linked to a stakeholder, the whisperer must reference that stakeholder by name in its response (e.g., "for your 1:1 with Priya…"), to make the "contextual assistant" promise observable in the first interaction.

**Response shape and interaction**
- R4. Default response is one-shot: a 2-3 line coaching summary plus, when the task is artifact-shaped, a drafted artifact below.
- R5. Every response includes an explicit "assumptions I made" block the user can confirm or correct (the draft-partner pattern).
- R6. When the task is vague or context is thin, the whisperer asks one clarifying question instead of producing a generic answer (R5's assumptions block does not substitute for this — clarifying questions are for when even the assumptions would be invented).
- R7. The one-shot response exposes a "keep going" affordance that expands into a chat thread scoped to that task; the thread persists, and reopening the same task later restores it.
- R8. Chat threads are scoped per task; no cross-task linking, no thread search, no thread sharing across users in v1.
- R8a. Chat threads cap at 10 turns per task. At the cap, the whisperer produces a recap summary plus a soft-block prompt: "mark this task done, escalate, or close without resolution?" — preserving ritual integrity rather than allowing unbounded back-and-forth.

**Tone, latency, and ritual integrity**
- R9. Whisperer tone matches Arcora's brand voice: concise, supportive, ritual-friendly — not chatty or motivational-coach. Responses do not exceed 4 lines of coaching prose plus the drafted artifact (if any).
- R10. Whisperer responses must complete within 5 seconds end-to-end on typical context loads; perceived latency must be acceptable inside a 3-min ritual.

**Quota and pricing**
- R11. Whisperer invocations are gated by the existing shared daily-quota bucket: Free has 5 invocations/day shared with KB enrichments, Pro has 100/day shared with KB enrichments. No new metering model is introduced; quota counter is the existing `enrichmentBudgetUsedToday` concept.
- R12. Hitting the quota ceiling surfaces a clear user-facing message; on Free, the message includes an upgrade-to-Pro CTA. The message must distinguish "you hit the daily limit" from "the AI is unavailable" so users understand recovery.

**Event log substrate (load-bearing for compounding)**
- R13. Every whisperer interaction emits typed events into a plan event log: at minimum `whisperer_invoked`, `whisperer_accepted`, `whisperer_edited`, `whisperer_discarded`, `whisperer_chat_expanded`; plus per-turn semantic events (`stuck_signaled`, `blocker_named`, `stakeholder_referenced`, `task_reframed`, `commitment_made`) on chat-thread turns. Event emission is non-blocking — a user-facing response must not be delayed waiting on an event write.
- R14. The event log is shaped to be consumed by future AI features (self-tuning regen, cohort taxonomy, role-eval suites, writable 30/60/90 reviews). v1 ships emission even though most consumers are deferred — this is the v1 cost of avoiding a stateless silo.

**Telemetry**
- R15. The minimum AI telemetry spine ships with v1: invoke, accept, edit, discard, re-invoke-on-same-task, time-to-artifact. North-star metric is **artifact accepted/used**, not invocations or chat opens.

**Guardrails**
- R16. A task-size classifier (cheap heuristic, no LLM call) routes "small" tasks (estimated under 5 minutes, single-step, no artifact) to a 2-line tip response without chat expansion; full hybrid is reserved for tasks where the context payoff justifies the latency/cost.
- R17. Whisperer responses must not surface PII about stakeholders the user has not entered themselves (no scraping, no invention, no implied facts).

**Privacy**
- R18. Whisperer chat content stays per-user: not surfaced to managers, peers, or other users in v1, even when manager-share is enabled on the plan. Chat content is included in standard user data export and account deletion.

**Reliability**
- R19. Whisperer responses retry once on JSON-parse failures with structured-output enforcement before falling back. On AI-provider outage, the whisperer surfaces a graceful task-type-based tip fallback rather than failing silently.

---

## Acceptance Examples

- AE1. **Covers R2, R3.** Given the user has a task "Draft 1:1 agenda for Marcus" linked to stakeholder Marcus, when the user taps "help with this," the whisperer response references Marcus by name and adapts content based on the user's role and phase.
- AE2. **Covers R4, R5.** Given the user has an artifact-shaped task, when the whisperer responds, the response contains both a coaching summary AND a drafted artifact, and an explicit "assumptions I made" block is shown.
- AE3. **Covers R6.** Given the user has a vague task like "Prepare for week 2" with no stakeholder or goal linkage, when the user taps "help with this," the whisperer asks one specific clarifying question rather than producing a generic answer.
- AE4. **Covers R7, R8.** Given the user has previously expanded a one-shot response into a chat thread on Task A and the conversation reached 3 turns, when the user later returns to Task A and invokes the whisperer, the chat thread re-opens with all 3 turns visible. Reopening Task B does not show Task A's thread.
- AE5. **Covers R11, R12.** Given a Free-tier user has hit their daily whisperer quota, when they tap "help with this," they see a clear "daily limit reached" message with an upgrade-to-Pro CTA.
- AE6. **Covers R13.** Given any whisperer interaction completes, when the plan event log is inspected, structured typed events corresponding to that interaction are present (`whisperer_invoked` at minimum on F1; semantic event types on F2 chat turns where applicable).
- AE7. **Covers R16.** Given the user taps "help with this" on a small task estimated under 5 minutes (e.g., "Send a Slack thanks to Priya"), when the whisperer responds, the response is a 2-line tip without a draft and without an expand-to-chat affordance.
- AE8. **Covers R19.** Given the AI provider returns a malformed JSON response, when the whisperer is invoked, it retries once with structured-output enforcement; on a second failure, it surfaces a task-type-based tip rather than an error.

---

## Success Criteria

- **Activation:** ≥40% of Pro users invoke the whisperer at least 3 times in their first 7 days — measures both discoverability and perceived value within the daily ritual.
- **Artifact quality:** ≥35% of whisperer responses that include a drafted artifact result in the user accepting, editing, or using the draft. North-star measured via R15 telemetry plus R13 event log; this is what we optimize, not invocation count.
- **Ritual integrity:** Median time spent in expand-to-chat per ritual session stays under 60 seconds. If it consistently exceeds this, chat is eating the ritual and the task-size classifier (R16) or response length cap (R9) needs tightening.
- **Compound payoff visibility (week 4):** By week 4 of a user's plan, at least one whisperer response observably references context from week 1 or 2 (e.g., a stakeholder mentioned earlier, a reflection theme that recurs) — qualitatively verifiable; precondition for the "feels contextual" promise being honest.
- **Downstream handoff quality:** `ce-plan` can produce a concrete implementation plan from this document without needing to invent product behavior, scope boundaries, success criteria, or substrate decisions about event emission.

---

## Scope Boundaries

- No always-available copilot or global AI sidebar across the product (roadmap)
- No ambient-intelligence layer that reorganizes plan or today without user request (roadmap)
- No calendar integration in v1 (roadmap — ideation survivor #5, highest-priority context extension)
- No morning brief synthesizer on Today view (roadmap)
- No end-of-day Socratic reflection partner (roadmap)
- No "I only have 30 min today" plan re-cut / plan negotiator (roadmap)
- No cross-task long-term memory layer (deferred — the goals/stakeholders/reflections graph plus the new event log provide shared context in v1)
- No voice input or audio-only mode (deferred — modality roadmap)
- No manager-facing or shared whisperer output (deferred — ideation survivor #7 for v2 manager-loop)
- No public sharing of whisperer chat content (deferred — ideation survivor #8 for v2+ public sample library)
- No autonomous-agent execution (no "send this Slack message for me," no "schedule this meeting"); user always copies the artifact
- No SOAP-style auto-distillation of whisperer transcripts into reflections (deferred — ideation survivor #2)
- No stuck-pattern taxonomy clustering across users (deferred — ideation survivor #3)
- No writable 30/60/90 review-page diffs (deferred — ideation survivor #4)
- No negative-signal vault eval infrastructure / role-specific eval harness (deferred — ideation survivor #6)
- No knowledge-base RAG retrieval inside whisperer context in v1 (the `@convex-dev/rag` plumbing exists and is used by plan-generation; whisperer deliberately stays outside it to avoid cold-start)
- No new AI provider dependency, no new pricing tier, no new metering model
- No `@convex-dev/agent` component install, no agent-tool-use, no fine-tuning, no on-device inference in v1

---

## Key Decisions

- **Anchor v1 inside the existing 3-min daily ritual rather than as a broader AI layer.** Aligns with STRATEGY's "lightweight daily ritual" approach. The user explicitly chose this over always-available copilot and ambient intelligence. Roadmap surfaces extend from this proven anchor.
- **Hybrid coaching + artifact response (not coaching-only and not artifact-only).** Matches more task shapes than either pure form; the AI decides whether to draft based on artifact-shape classification rather than forcing the user to choose.
- **Expandable one-shot → chat (not pure one-shot, not pure chat).** Resolves the tension between the user's "I can interact with it" intent and the ritual-displacement failure mode. One-shot is the default fast path; chat is opt-in escape hatch capped by R9/R10.
- **Context = task + role + phase + adjacent + goals + stakeholders + recent reflections.** Hits the "contextual assistant" promise without the cold-start trap of empty RAG. Calendar is the highest-priority v2 context extension per ideation survivor #5.
- **v1 emits typed events into a new plan event log substrate even though most consumers are deferred.** Ideation survivor #1 — without this, v1 is a stateless silo and every later AI feature pays a fresh integration cost. The substrate is the highest-leverage choice in the doc.
- **Telemetry spine ships with v1, not after.** Plan/15 zero-analytics is the structural reason every product retrospectively says "we should have measured X." North-star event is artifact-accepted, not chat-opened (defends against the engagement-over-outcome failure mode).
- **Task-size classifier ships with v1 as guardrail.** Prevents the "AI lectures you about sending a Slack message" failure mode and signals that the whisperer respects when it is NOT needed.
- **Draft-partner UX pattern (assumptions surfaced for correction).** Ideation survivor #6 — turns user pushback into proprietary negative-signal training data and inoculates against the "AI is generic and slop" perception.
- **Manager loop (ideation survivor #7) is the strongest v2 strategic move, but explicitly out of v1 scope.** v1 validates the per-task IC-facing surface first; the manager loop builds on top once v1 retention bends are observed.
- **v1-anchor challenger surfaced and considered, not adopted:** the curated-playbook-library + chooser path (ideation rejection table, F6#7) was a real fork. v1 stays LLM-generative because the user wants the personalization depth and "assistant feel" the chooser path cannot match. Staged adoption (playbooks-first → LLM-later) remains a legitimate fallback if cost/latency or quality assumptions miss.
- **Shared quota bucket with existing enrichments (Free 5/day, Pro 100/day).** Rationale: one daily counter for the user to track; reuses the existing `enrichmentBudgetUsedToday` schema field that's already wired but unused. Risk: heavy whisperer use crowds out KB enrichments — accepted in v1, revisit if observed in retention data.
- **Chat-thread cap at 10 turns with soft-block recap.** Rationale: defends ritual budget without forcing strict 5-turn cutoff that frustrates artifact iteration. Soft-block recap also generates a natural reflection event into the event log.

---

## Dependencies / Assumptions

**Pre-AI infrastructure prerequisites that must ship before or alongside v1:**
- Plan-repair retries on `generatePlan` (plan/17 silent JSON-parse failures) — applies equally to the whisperer (R19).
- Timezone correctness (plan/03 daily reminders, plan/13 Today query) — a broken ritual cadence breaks any layered AI feature; D7/D30 retention is gated on the ritual firing at local 8am.
- AI telemetry spine (plan/15) — captured as R15; needed for every success criterion above to be measurable.
- Plan event log substrate (R13-14) — the storage and schema design belongs to planning; this brainstorm commits to its existence and shape.

**Existing infrastructure reused (verified in codebase):**
- `convex/lib/ai.js:generateText()` — dual-mode Claude/GPT wrapper is the AI call shape.
- `convex/lib/rateLimit.js` — mature per-user daily-budget enforcement; whisperer extends the existing pattern (no new metering model).
- `convex/stakeholders.js` + `convex/goals.js` + `convex/reflections.js` — context sources are queryable and live.
- `convex/lib/kbContext.js:recordRetrieval()` — precedent audit pattern for event-log writes.

**Stack constraints:**
- No new AI provider, no new managed service, no new SDK in v1; stays on Anthropic + OpenAI.
- `@convex-dev/rag` is installed and used by plan-generation, but the whisperer does NOT invoke it in v1 (deferred per Scope Boundaries to avoid cold-start trap).
- `@convex-dev/agent` is NOT installed and NOT added in v1.

**Verified assumption:** the existing free-text activity `category` field is acceptable input to the whisperer without typed-taxonomy migration. Codebase check confirms `convex/schema.js:activities` stores category as free-text string; LLM-driven taxonomy migration is ideation survivor #3, explicitly deferred.

---

## Outstanding Questions

### Resolve Before Planning

*(All previously-blocking questions resolved.)*

### Deferred to Planning

- **[Affects R13, R14] [Technical]** Exact schema for the plan event log table — field names, indexes, partitioning, retention policy. Belongs to planning per Convex conventions in `convex/_generated/ai/guidelines.md`.
- **[Affects R4, R16] [Technical]** Implementation of artifact-shape classifier and task-size classifier — pure heuristic vs lightweight LLM call. Cost/latency tradeoff resolved during planning.
- **[Affects R19] [Technical]** Retry strategy details — backoff parameters, structured-output enforcement library, fallback content shape per task type.
- **[Affects R9] [Needs research]** Concrete tone/voice prompt design — should be evaluated against a small held-out set of role × task combinations before locking. Belongs to planning's eval-design phase.
- **[Affects R3, R17] [Technical]** Exact stakeholder PII shape in the prompt (full name vs first name vs role label) — privacy + tone tradeoff.
- **[Affects R13] [Technical]** Whether semantic event types (`stuck_signaled`, etc.) are derived inline at response time (LLM second pass) or post-hoc (batch clustering). Cost/timing tradeoff.

### From 2026-05-12 ce-doc-review

*Findings from a parallel review by 6 reviewer personas (security-lens timed out). Captured here so `/ce-plan` engages them in context. Each entry includes confidence + reviewer attribution.*

**Premise-level decisions (P1) — root + dependents**

- **[Affects R13, R14, R15] [User decision]** Event log substrate ships with all v1 consumers (self-tuning regen, cohort taxonomy, role-eval suites, writable reviews) deferred. Three reviewers (adversarial, scope-guardian, product-lens; promoted 75→100 via cross-persona) recommend narrowing R13–R14 to a `whisperer_events` table covering only telemetry needs; merging R13 with R15 to remove duplication; deferring the semantic event taxonomy (`stuck_signaled`, `blocker_named`, etc.) until a real consumer scopes it. The user's existing rationale ("avoid stateless silo") is sound but the framing as "highest-leverage v1 choice" treats consumer-shipping as inevitable. Decide: narrow now, or commit to a falsification trigger (e.g., "if no consumer ships by month N, strip the substrate").
  - Dependent: R13/R15 emission duplication (scope-guardian P2) — two requirements describe one capability; resolves if substrate narrows.
  - Dependent: Semantic event types `stuck_signaled` / `blocker_named` invented without consumer-driven schema validation (scope-guardian + adversarial, P1, anchor 100). Either inline-LLM 2nd-pass (blows R10's 5s budget) or post-hoc batch (adds async queue scope). No v1 consumer reads them.
  - Dependent: Non-blocking event emission can silently drop events (adversarial P1). R13 requires non-blocking writes but doesn't specify delivery guarantees, dead-letter queue, or write-success telemetry. Future consumers ship on incomplete data without knowing.

- **[Affects R11, R12, R18 quota text] [User + technical decision]** R11 reuses `enrichmentBudgetUsedToday` as a "shared bucket" but feasibility verified this contradicts the codebase: that field is a KB-specific count incremented only by KB enrichment; real AI ops use a separate `aiUsage` cents ledger via `internal.rateLimit.reserve`, keyed by UTC day, with Free=200¢/day and Pro=1500¢/day. Three implications: (a) the shared-bucket promise can't be honored without new infra (extend cents ledger / generalize the count field / build a third counter); (b) the cents ceiling can deny a whisperer call before the 5/day count is reached — R12 currently has no third state for "cost-limit reached"; (c) UTC day key vs user-local timezone (especially with the project's UK-default-Europe/London expectation) breaks "daily" UX. Resolve before planning: pick one of the three implementation paths and revise R11–R12 accordingly. (feasibility, P1, anchor 100)

- **[Affects Success Criteria — Compound payoff visibility (week 4)] [User decision]** The criterion as written ("at least one whisperer response observably references context from week 1 or 2 — qualitatively verifiable") is unfalsifiable; satisfied by a single anecdote. Three personas converged (scope-guardian, product-lens, adversarial; promoted 75→100). Either: (a) replace with denominated threshold — e.g., "≥30% of week-4 active Pro users see at least one whisperer response that names a stakeholder, goal, or reflection theme first surfaced in weeks 1–2 (measured via R13 events tagged with first-seen-week)" — AND widen R2's context bundle to include older reflections beyond the 3 most recent; or (b) move this criterion to roadmap alongside cross-task memory. The current R2 bundle ("3 most recent reflections") cannot deliver week-4 recurrence.

**P0 / P1 user-facing decisions**

- **[Affects R7] [Apply candidate]** R7 reads unconditionally ("the one-shot response exposes a 'keep going' affordance") but R16 + AE7 say small tasks omit chat expansion. Add carve-out clause to R7: "On non-small tasks (classified per R16), the one-shot response exposes a 'keep going' affordance…". (design-lens P0, anchor 100, gated_auto with concrete fix)

- **[Affects R4, R7, F1, F2 — IA] [User + design decision]** Whisperer response rendering container is unspecified — inline expansion of the task card, modal overlay, drawer/sheet, persistent panel. This is the most consequential information-architecture decision for the Today view. Pick one approach before planning OR defer explicitly to a design-spec phase before implementation. (design-lens P0, anchor 100)

- **[Affects R15, Success Criteria — Activation, Artifact quality] [User decision]** The "artifact accepted/used" north-star undercounts core value for non-artifact tasks (R6 clarifying-question path, R16 small-task tip, R4 coaching-only summaries). Activation target (≥40% Pro invoke 3x in 7d) measures invocation, not STRATEGY.md retention/phase-progression. Either: (a) reframe north-star as a composite ("artifact accepted OR clarifying question answered OR tip used") with separate measures, and (b) add a counterfactual / cohort-comparison criterion that ties whisperer activity to D7/D30/D60 retention deltas. (product-lens P1 ×2)

- **[Affects R11] [User decision]** Shared quota with KB enrichments creates self-defeating crowd-out at Free tier: a user who taps the whisperer 3 times their first ritual has 2 invocations left for everything else that day, including the KB enrichments that power plan quality. The more the whisperer succeeds, the more it cannibalizes upstream. Either (a) split the buckets, or (b) raise Free count to 8–10 if shared. (product-lens P1)

- **[Affects R19] [Technical]** R19 reads as "retry once with structured-output enforcement before falling back" but the current `convex/lib/ai.js:generateText` has no retry logic, no Claude tool_use JSON mode, no OpenAI response_format support, and no shared retry helper. Dependencies acknowledge plan/17 as prerequisite but R19 reads as if solved. Planning must build the retry harness from scratch for BOTH provider paths. (feasibility P1, anchor 100)

- **[Affects F1, R2, R3] [Technical]** Context bundle assembly has no nil/empty/error path: what happens on day 1 (no reflections yet)? What if the linked stakeholder row was soft-deleted or has no name set, so R3's "must reference by name" cannot be honored? What if `onboarding.getByUserId` returns null for an in-flight user? Add an explicit context-availability matrix to F1 specifying fallbacks. (feasibility P1)

- **[Affects R10] [Technical]** 5-second latency budget doesn't carry the worst-case path: artifact-shape classifier (potentially an LLM call per Outstanding Questions) + main response + R19 retry = up to 3 sequential Claude/GPT calls. claude-sonnet-4 averages 2–4s for short prompts; worst path exceeds 5s. Either (a) tighten budget assumptions (classifier MUST be heuristic; main MUST return first try), or (b) split into p50 vs p95 targets. (feasibility P1)

- **[Affects F2, R7, R8] [Technical]** Chat thread persistence has no defined storage shape. The doc forbids `@convex-dev/agent`; no existing chat-thread table; relationship to `activities` rows unspecified. Add a deferred-to-planning entry: "Schema for whisperer chat threads — table, relationship, turn record shape, index for per-task lookup." (feasibility P1)

- **[Affects AE7, R16] [Apply candidate]** AE7 claims to cover R16 but introduces "no draft" — a constraint not stated in R16. Either tighten R16 to read "…to a 2-line tip response without a draft and without chat expansion…", or revise AE7 to match R16's actual wording. (coherence P1)

- **[Affects R4] [User decision]** Artifact-shape classifier has no stated accuracy floor or user-facing override. If wrong 30%, the hybrid UX collapses (artifact-shaped tasks get coaching-only; coaching-shaped tasks get inappropriate drafts) and the artifact-accept north-star metric becomes uninterpretable because the denominator is classifier-dependent. Add: minimum precision/recall target + a "show me a draft anyway / just coach me" user override. (adversarial P1)

**P1 design specifications (defer to planning's UX phase but track explicitly)**

- D3. 10-turn soft-block UI states (input disabled? recap rendered as message vs banner vs modal? what happens after each of three options?)
- D4. Assumptions-block interaction model (read-only / inline edit / re-run trigger / opens chat?) — load-bearing for R13 `whisperer_edited` event
- D5. Quota counter visibility BEFORE ceiling is hit — without it, users can't make informed choices
- D6. 5-sec response loading state (skeleton / streaming / spinner / progress text)
- D7. Always-visible affordance design weight on task cards vs existing card actions
- D8. Clarifying-question UI flow (input field placement, what re-renders after answer)
- D9. AI-provider fallback tip rendering location and content shape
- D10. Task cards with existing chat threads — visual indicator (badge / label change)?

**P2 considerations (planning may engage or defer)**

- **R8a 10-turn cap is invented v1 polish.** Four personas converge (scope-guardian, adversarial, product-lens, coherence). Cap value chosen pre-data; conflicts with the 60s-median ritual-integrity criterion (median allows a long tail of 5-10 min sessions). Recommend either: ship without a hard cap and instrument turn-distribution, or use a soft "you've been here a while" indicator at turn 7 with no hard block.
- **Assumptions-block (R5) may signal uncertainty rather than transparency** (adversarial P2). "Here's what I had to guess" on every response could undermine the "feels contextual" promise. Consider: collapse-by-default, OR surface assumptions only when they're material (confidence below threshold). Measure user trust impact before locking R5 as "every response."
- **Free 5 / Pro 100 quota is asserted on engineering economy, not modeled on conversion mechanics** (adversarial P2). Whether 5/day drives upgrades or kills activation is unmodeled. Pressure-test with day-in-the-life scenarios.
- **R17 stakeholder PII discipline is policy not mechanism** (scope-guardian P2). Add a concrete prompt-instruction or output-validator: "the prompt must enumerate all stakeholder facts passed and instruct the LLM to confine characterization to those facts." Add an acceptance example for "given only a name entered, the response contains no inferred facts."
- **3 recent reflections may surface stale/off-topic context** (adversarial P2). Add a recency-plus-relevance filter (e.g., reflections mentioning the linked stakeholder, goal, or category) rather than time-recency alone.
- **v1-anchor challenger (curated playbook library) has no falsifiable trigger for fallback** (product-lens P2). Add numeric thresholds to the rejection: e.g., "if post-launch p50 latency > 5s, artifact-accept < 20%, or PII-violation rate > X%, v1.5 pivots to playbook-first."
- **STRATEGY reference unexplained** (coherence P2). Either inline the relevant STRATEGY principle or add a file pointer (e.g., `STRATEGY.md`) so the rationale is self-contained.

**FYI observations (anchor 50) — track but don't block**

- C1: Terminology drift "plan event log" vs "plan event log substrate" — normalize when R13/R14 are revised.
- C7: Compound-payoff success criterion has no event-log proof mechanism defined (related to the P1 finding above).
- F8: AE6 inspection mechanism undefined (forward-compatible query needed once event log schema lands).
- P6: Always-visible "help with this" affordance on every task card may train learned-helplessness against the ritual. Worth examining alternatives (surface on second visit, after skip, after dwell).
- P9: Calendar v1 ordering not examined vs whisperer — ideation survivor #5 may be higher leverage than per-task whisperer for new ICs. (Treated as informational since user explicitly chose the whisperer anchor.)
- P10: Vague-task escape path (R6 clarifying question) has no measured failure mode — silent drift toward generic answers is undetectable without a held-out eval set.
- D11: Responsive + accessibility strategy absent (breakpoints, keyboard nav, screen reader labels, touch targets).
- AD11: 5s latency budget edge cases (decomposed analysis above).
- AD12: Per-task chat scoping forecloses cross-task pattern recognition — natural v2 feature.
- Security-lens timed out — no formal threat-model review returned this round. Re-running with the security persona alone may surface auth-boundary or LLM-prompt-injection concerns this review missed.
