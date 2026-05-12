---
title: "feat: Whisperer resume / minimize / start-fresh"
type: feat
status: active
date: 2026-05-12
origin: docs/brainstorms/2026-05-12-arcora-ai-whisperer-requirements.md
---

# feat: Whisperer resume / minimize / start-fresh

## Summary

Make the AI Task Whisperer feel persistent: when a user reopens the
affordance on a task they've already worked with, they see their prior
coaching summary + artifact + chat history instead of a fresh AI call.
The close (X) becomes a minimize action that preserves the thread; a
distinct "start fresh" action explicitly discards and resets. The
persistence substrate already exists (U3 wrote `whispererThreads` +
`whispererTurns`; U7 added the public `listByActivity` query) — this
plan wires the existing data into the UI and adds one small mutation
to close a thread by user choice.

---

## Problem Frame

The whisperer UI currently treats every "help with this" click as a
brand-new invocation. The close (X) clears local state, so a user who
collapses the response loses the rendered coaching summary, artifact,
and chat. Reopening the affordance fires `respond` again — which
appends a NEW assistant turn to the SAME thread (threads are
idempotent per `(userId, activityId)`), costing a Sonnet call and
giving the user a fresh response when they actually wanted the one
they were just reading. The data is on disk; the UI just doesn't read
it. Two consequences: (a) avoidable AI cost on every reopen, and (b)
the user perceives the feature as transient, which discourages
returning to a task partway through.

---

## Requirements

- R1. When a task has an existing open whisperer thread with at least one assistant turn, the affordance on that task renders as "resume" (not "help with this"), and on click rehydrates the response container from the most recent assistant turn — no `respond` call.
- R2. The close (X) on the response container minimizes it. The thread remains `open`; reopening the affordance shows "resume" exactly as above.
- R3. A distinct, lower-prominence "start fresh" action is available from the response container. It closes the current thread (`status="closed"`, `cappedReason="close_unresolved"`), clears local UI state, emits the existing `whisperer_discarded` telemetry, and returns the affordance to its default "help with this" state.
- R4. The resume rehydration honors the same envelope shape `WhispererResponse` expects today: `coachingSummary`, `artifact`, `assumptions`, `threadId`, `turnId`, `path`, `classifier`. Missing optional fields render gracefully.
- R5. The chat thread inside `ChatThread` continues to render via `listByActivity`; the resume path does NOT force the user into chat mode — they see the coaching summary first and can optionally expand "keep going" as today.
- R6. A user who has explicitly closed a thread (via "start fresh") can immediately invoke a new whisperer; the new call creates a new thread for the activity (the existing idempotency on `createThread` must be reconciled — see Key Technical Decisions).

**Origin acceptance examples (carried forward):**

- AE4 (origin R7, R8): reopening Task A re-opens the thread with prior turns visible. This plan makes AE4 visible at the affordance level, not just inside the chat sub-view.

---

## Scope Boundaries

- Not changing the chat thread storage model (still one-thread-per-(user, activity) for active threads).
- Not adding multi-thread history per task (a user can't browse previously-closed threads on the same task in v1 — closing means "start fresh", not "archive for later browsing").
- Not adding undo for "start fresh" — once a user closes a thread, it's closed.
- Not changing the turn-cap or cents-cap behavior — those still flip the thread to `capped`, which the affordance still recognizes (capped threads also show the prior summary, just without an active chat input).

### Deferred to Follow-Up Work

- Multi-thread history per task (archive / browse prior closed threads): defer until usage data shows demand. Today the thread storage already retains closed threads — only UI affordances are missing.
- "Re-run with fresh context" without losing the old thread: explicit user feature, defer.

---

## Context & Research

### Relevant Code and Patterns

- `convex/whispererThreads.js` — already has `listByActivity` public query (returns `{thread, turns}` or `null`) used by `ChatThread`. Same query can power the affordance-level resume detection.
- `convex/whispererThreads.js:createThread` — idempotent on `(userId, activityId)`. After "start fresh" the existing closed thread must NOT block creating a new open thread. See Key Technical Decisions.
- `convex/whispererInternal.js:finalizeRespond` — currently does the create-or-reuse-thread logic. Must learn to skip a `closed` thread and create a new one.
- `src/components/whisperer/HelpWithThisButton.js` — single-component affordance + invocation. Currently stateless on mount.
- `src/components/whisperer/WhispererResponse.js` — already accepts a `result` envelope. Needs to support a resumed envelope (no `pending`, no AI call) and expose "start fresh" alongside the existing close X.
- `src/components/whisperer/ChatThread.js` — already subscribes to `listByActivity` and renders turns. No changes needed for resume.
- `src/components/whisperer/SoftBlockBanner.js` — capped-thread UI. Already correct; resume should also handle the capped state gracefully (render the recap turn, no input).

### Institutional Learnings

- The 2026-05-12 PII-validator incident proved that hitting `respond` blindly on every click is expensive (3 retries × Sonnet + Haiku ≈ 35s before fallback). Resume avoids re-paying that cost on reopens.

### External References

- None needed. Convex idempotent-mutation patterns are well-established in this codebase (see `whispererInternal.finalizeRespond`).

---

## Key Technical Decisions

- **Reuse the existing `listByActivity` query for affordance-level detection.** It already returns `{thread, turns}` — exactly what we need. No new query. Component subscribes once; both `HelpWithThisButton` and `ChatThread` benefit from Convex's automatic reactivity.
- **Reconstruct the result envelope client-side from the last assistant turn.** Storing a denormalized "last response envelope" on the thread row would duplicate data and risk drift; the turn row already carries everything we need (`content`, `artifact`, `assumptions`, `clarifyingQuestion`, modelUsed). A small `envelopeFromTurns(thread, turns)` helper in `src/components/whisperer/` is the single source of truth.
- **`finalizeRespond` is the only place that mints threads; widen its idempotency to "create-or-reuse-OPEN".** Today it reuses ANY existing thread regardless of status (and throws when status !== "open"). After this plan, a `closed` or `capped` thread no longer blocks creating a new `open` thread. This is the smallest change that makes "start fresh" work end-to-end.
- **One Convex mutation, `closeThread`, for the user-initiated close.** Distinct from `markCapped` (system-initiated). Auth-checks via the same join-through-activity pattern as `whispererTelemetry.markDiscarded`. Emits `whisperer_discarded` via the existing telemetry path; no new event type.
- **"Resume" and "help with this" are the SAME button, just with different label + icon based on the query result.** Avoids dual-render flicker and keeps the affordance footprint identical (important — task cards are dense). The button reads `data?.thread?.status` to decide.
- **Minimize is purely client-state.** No server call. The thread stays `open` because it already is.

---

## Open Questions

### Resolved During Planning

- *Should resume re-fire the semantic classifier?* No. Resume reads existing data — no new turn, no new event. The original `whisperer_invoked` already fired when the response was generated.
- *Should `force_full` survive a resume?* The classifier decision is captured on the original turn; resume just re-renders. If the user wants a different shape they can start fresh.
- *Where does "start fresh" live visually?* Inside the WhispererResponse header, beside the existing close X — small text button "start fresh" with a confirmation tooltip. Not as prominent as the close — destructive actions should require intent.

### Deferred to Implementation

- The exact icon for the "resume" affordance variant (likely `solar:history-linear` or `solar:refresh-circle-linear`) — choose during implementation against the existing icon palette in `KnowledgeStatusCard.js`.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
HelpWithThisButton (on mount + reactive)
├── useQuery(api.whispererThreads.listByActivity, {activityId})
│      data: { thread, turns } | null
│
├── if data?.thread?.status === "open" && hasAssistantTurn(turns):
│      render "resume" affordance
│      onClick → setResult(envelopeFromTurns(thread, turns))
│                NO respond() call
│
├── if data?.thread?.status === "capped":
│      render "view recap" affordance (uses same path; SoftBlockBanner shows in chat)
│
└── else:
       render default "help with this"
       onClick → respond(...)  (existing path)

WhispererResponse
├── close (X)              → onClose()        // minimize: clear local result only
└── "start fresh" link     → onStartFresh()   // closeThread + markDiscarded + clear

closeThread (new mutation)
├── auth check via activity ownership
├── if thread.status === "open": patch status=closed, cappedReason=close_unresolved
└── idempotent on already-closed
```

---

## Implementation Units

- U1. **Public mutation `closeThread` + finalizeRespond idempotency fix**

**Goal:** Add the user-initiated close primitive; widen `finalizeRespond` so a closed thread no longer blocks starting a new one.

**Requirements:** R3, R6.

**Dependencies:** None.

**Files:**
- Modify: `convex/whispererThreads.js` — add `closeThread({activityId})` public mutation. Auth-checks via activity ownership (mirror `listByActivity`). Sets `status="closed"`, `cappedReason="close_unresolved"`. Idempotent on already-closed.
- Modify: `convex/whispererInternal.js` — `finalizeRespond` currently does `unique()` on `(userId, activityId)` and reuses ANY thread; if status !== "open" it throws. Change to: only reuse threads where `status === "open"`. If a closed/capped thread exists, create a new row alongside it.
- Test: `convex/whispererThreads.test.js` — add tests for `closeThread` (open → closed, closed → no-op, cross-user denial). Add test for `finalizeRespond` creating a new thread when prior thread is closed.

**Approach:**
- `closeThread` mirrors `listByActivity`'s auth pattern: get activity, check ownership, then look up thread by `(userId, activityId)`. Returns `null` on no-op; returns the closed thread on first close.
- `finalizeRespond`: the existing query uses `by_user_activity` index returning a unique row. After this change there may be MULTIPLE rows per `(userId, activityId)` over time. The query becomes "find the most recent open thread"; if none exists, insert. The `by_user_activity` index still works for the lookup; `.unique()` is replaced with a filter for `status === "open"` and an `order("desc").first()` for recency.

**Patterns to follow:**
- `convex/whispererTelemetry.js:markDiscarded` for the auth-via-activity join (the activity check ensures the caller owns the thread without a redundant thread query).

**Test scenarios:**
- Happy path (`closeThread`): user owns an open thread → mutation flips it to closed; subsequent `listByActivity` returns null because the open-thread filter no longer matches (or returns the closed thread depending on the read query — verify the contract).
- Idempotency (`closeThread`): calling on an already-closed thread returns a no-op without error.
- Edge case (`closeThread`): no thread exists for the activity → returns null, no insert.
- Auth (`closeThread`): user A calling on user B's activity → throws or returns null (match the existing telemetry mutation's behavior; both are valid as long as it does NOT mutate).
- Integration (`finalizeRespond`): seed a closed thread for `(userId, activityId)`; call `finalizeRespond` → a new thread row is created with `status="open"`, and `listByActivity` returns the new one.
- Edge case (`finalizeRespond`): existing open thread → reused as today (no regression).

**Verification:**
- All four threads-table tests pass.
- The existing U4 + U6 tests still pass without modification.

---

- U2. **`envelopeFromTurns` helper + resume hydration in `HelpWithThisButton`**

**Goal:** Detect an existing open thread on mount and rehydrate the response envelope from the most recent assistant turn — no AI call.

**Requirements:** R1, R4, R5.

**Dependencies:** None (uses existing `listByActivity`).

**Files:**
- Create: `src/components/whisperer/envelopeFromTurns.js` — pure helper. Signature: `envelopeFromTurns(thread, turns) → result envelope | null`. Returns null when no assistant turn exists.
- Modify: `src/components/whisperer/HelpWithThisButton.js` — add `useQuery(api.whispererThreads.listByActivity, {activityId})`. When the query resolves and a usable assistant turn exists, render the "resume" affordance; on click set `result` from the helper, without calling `respond`.
- Test: `src/components/whisperer/envelopeFromTurns.test.js` — pure function tests against synthetic turns.

**Approach:**
- The helper walks turns in descending `seq`, finds the most recent `role === "assistant"`, and projects fields onto the envelope:
  - `coachingSummary = turn.content`
  - `artifact = turn.artifact || undefined`
  - `assumptions = turn.assumptions || []`
  - `clarifyingQuestion = turn.clarifyingQuestion || undefined`
  - `threadId = thread._id`, `turnId = turn._id`
  - `path` — inferred: `artifact` present → "hybrid"; `clarifyingQuestion` present → "clarify"; else "small" if content is short and no artifact, else "hybrid". Acceptable approximation in v1; the classifier decision lives in `planEventLog` if we ever need exact replay.
  - `classifier` — omit; UI doesn't surface it. Add a comment explaining the omission.
  - `status: "ok"` — required for `WhispererResponse` to render the success branch.
- In `HelpWithThisButton`: only switch into "resume" mode when `data` is truthy AND `data.thread.status !== "closed"` AND `envelopeFromTurns` returns non-null. `data === undefined` is the still-loading state; render the default button to avoid layout shift.
- Variant of the button when in resume mode: same component shape, label "resume" with a `solar:history-linear` icon. Click handler calls `setResult(envelope)` without `setPending(true)`, since there's no async work.

**Patterns to follow:**
- `src/components/whisperer/ChatThread.js` — same `useQuery` shape, same null-handling.

**Test scenarios:**
- Happy path: turns with one assistant entry → helper returns envelope with the right `coachingSummary`.
- Edge case: empty turns → returns null.
- Edge case: only user turns (no assistant) → returns null.
- Edge case: multiple assistant turns → returns envelope for the highest-`seq` one.
- Edge case: turn with `artifact` empty string → envelope `artifact` is undefined (so `WhispererResponse` doesn't render the empty draft block).

**Verification:**
- Test file passes.
- Manual smoke: open whisperer on a task with prior turn → "resume" button visible → click → response renders instantly (no skeleton).

---

- U3. **"Start fresh" action in `WhispererResponse`**

**Goal:** Surface the explicit-discard path as a distinct, lower-prominence action; wire it to `closeThread` + `markDiscarded` + local state clear.

**Requirements:** R3, R6.

**Dependencies:** U1 (needs `closeThread`).

**Files:**
- Modify: `src/components/whisperer/WhispererResponse.js` — add a small "start fresh" text-button next to the existing close X. Wire it to a new `handleStartFresh` that:
  1. Calls `closeThread({activityId})` (best-effort — swallow error like other telemetry).
  2. Calls `markDiscarded({turnId})` to keep telemetry consistent with the old close behavior.
  3. Calls `onClose()` to clear local state in the parent (`HelpWithThisButton`).
- Modify: `src/components/whisperer/HelpWithThisButton.js` — clarify the close-X contract by renaming `onClose` semantics to "minimize" in comments; no behavior change to the X itself (it remains a local-state clear).
- No test file (this is presentational wiring + already-tested mutations).

**Approach:**
- Visual treatment: small text button "start fresh" with `solar:refresh-linear` icon, sits in the response header to the LEFT of the close X. Subtle styling — `text-stone-500 hover:text-[#D97757]`. Not a primary action.
- The X stays as today: terse, no confirm dialog. Minimize is cheap; users should be able to dismiss without ceremony.
- Microcopy on "start fresh": no confirm tooltip in v1 — the button text "start fresh" + the icon already telegraph the action. If telemetry shows accidental clicks we can add a confirm later.

**Patterns to follow:**
- The existing close X in `WhispererResponse.js` for icon-button styling.
- `whispererTelemetry.markDiscarded` usage already inside `WhispererResponse` for the wiring pattern.

**Test scenarios:**
- Test expectation: none — pure UI wiring + existing mutations. The mutations are covered by U1 (closeThread) and the existing `whispererTelemetry.test.js` (markDiscarded). Manual QA verifies the button appears, the click closes the thread, and the affordance returns to "help with this" (no resume) afterward.

**Verification:**
- Manual: click "start fresh" → next render shows "help with this" again (no resume because thread is now closed).
- Manual: `npx convex run whispererThreads:listByActivity '{"activityId":"<id>"}'` confirms `null` after start-fresh.

---

- U4. **End-to-end resume + minimize smoke check + brief docs note**

**Goal:** Verify all three modes work together; capture the new contract in the institutional learnings record.

**Requirements:** R1, R2, R3 (composite).

**Dependencies:** U1, U2, U3.

**Files:**
- Modify: `docs/solutions/` — add a short markdown note describing the resume contract (UI states: help / resume / view-capped / closed) and the `finalizeRespond` widened-idempotency rule, so future agents don't accidentally revert it.
- No new tests in this unit; existing per-unit tests cover behavior.

**Approach:**
- Walk through every UI state manually:
  1. Fresh task → "help with this" → respond runs → response renders.
  2. Click X → response disappears, button shows "resume".
  3. Click resume → response re-renders instantly from local helper (no AI call).
  4. Open chat from response → ChatThread shows prior turns.
  5. Send a chat turn → continueThread runs → new turn appended.
  6. Click X → minimize. Button shows "resume". Click resume → still shows turn 1's coaching (the resume helper picks the LAST assistant turn — confirm this matches expectation).
  7. Click "start fresh" → confirm thread closed. Button reverts to "help with this".
  8. Click "help with this" → respond runs → fresh response → new threadId.
- Confirm the chat UI ALSO sees the right state at each step (its own `listByActivity` query is reactive).

**Test scenarios:**
- Test expectation: none — manual integration smoke check. The unit-level tests cover the surfaces; this unit captures the documentation and verification of composite behavior.

**Verification:**
- All 8 manual steps above pass without surprise.
- The new `docs/solutions/` note exists and references this plan + the resume affordance.

---

## System-Wide Impact

- **Interaction graph:** `HelpWithThisButton` now subscribes reactively to `listByActivity`; the affordance can change label without explicit user action if another tab on the same account closes a thread. This is acceptable and arguably correct — multi-tab Convex reactivity is the existing norm.
- **Error propagation:** `closeThread` failures are non-blocking (matches the existing telemetry policy). `respond` failures still produce typed envelopes as today.
- **State lifecycle risks:** A thread row can now exist in `closed` state with the user later creating a fresh `open` thread for the same activity. The new `finalizeRespond` query must filter on `status === "open"` to find the active thread; failing to do so would either reuse a closed thread (broken) or fail with `.unique()` (also broken). Test scenario in U1 covers this directly.
- **API surface parity:** No external API change. `api.whisperer.respond` and `api.whisperer.continueThread` signatures unchanged. One new public mutation (`whispererThreads.closeThread`).
- **Integration coverage:** Manual end-to-end smoke check in U4 covers the cross-component reactivity between `HelpWithThisButton` and `ChatThread`.
- **Unchanged invariants:** Thread + turn schemas. `respond` + `continueThread` action behavior. PII validator + telemetry policies. Cap state machine.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `finalizeRespond` change subtly breaks existing one-shot flows (regression on the most-used path). | U1 keeps the existing "open thread is reused" semantics; only adds the "closed/capped → create new" path. Existing U4 + U6 test suites must pass unchanged. |
| Envelope reconstruction misses a field present on the original response (e.g., `pii_warning`). | `pii_warning` is telemetry-only; the resume path doesn't need it because no new AI call happened. Other UI-relevant fields are all stored on the turn row. The helper is small and unit-tested. |
| User confuses "minimize" with "discard" and is surprised when the next click resumes instead of starting fresh. | Distinct icons + the "start fresh" label make the choice explicit. If telemetry shows confusion (high `whisperer_discarded` rate following a resume) we revisit. |
| Multi-tab race: tab A closes a thread, tab B is mid-typing in chat. | `appendUserTurn` already rejects on `closed` status with `thread_closed` envelope. The chat UI handles this gracefully today (renders the SoftBlockBanner). No new mitigation needed. |

---

## Documentation / Operational Notes

- No migration. Existing rows in `whispererThreads` are unaffected; `finalizeRespond`'s widened semantics are forward-only.
- No new environment variables or secrets.
- Telemetry: `whisperer_discarded` continues to fire from the "start fresh" path. The minimize action emits nothing — by design (minimize is not a signal worth measuring).

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-12-arcora-ai-whisperer-requirements.md](../brainstorms/2026-05-12-arcora-ai-whisperer-requirements.md)
- **Parent plan:** [docs/plans/2026-05-12-001-feat-arcora-ai-task-whisperer-plan.md](2026-05-12-001-feat-arcora-ai-task-whisperer-plan.md)
- **Acceptance example carried forward:** AE4 (origin doc § Acceptance Examples) — "reopening Task A shows the prior thread with all turns."
- Related code:
  - `convex/whispererThreads.js`
  - `convex/whispererInternal.js`
  - `src/components/whisperer/HelpWithThisButton.js`
  - `src/components/whisperer/WhispererResponse.js`
  - `src/components/whisperer/ChatThread.js`
