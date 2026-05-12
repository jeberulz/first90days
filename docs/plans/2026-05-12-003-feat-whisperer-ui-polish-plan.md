---
title: "feat: Whisperer UI polish — single timeline, less chrome, tighter density"
type: feat
status: active
date: 2026-05-12
origin: docs/brainstorms/2026-05-12-arcora-ai-whisperer-requirements.md
---

# feat: Whisperer UI polish — single timeline, less chrome, tighter density

## Summary

The expanded whisper currently consumes several viewport heights and
renders the latest assistant turn twice (once in the hero, once in
the chat list). This plan collapses the hero + chat zones into a
single conversation timeline, strips redundant chrome (per-turn
bordered cards, stacked uppercase labels, the WHISPER header), and
constrains line measure + assumptions density so the response panel
fits comfortably inside a task card without scroll-hijacking the
page.

---

## Problem Frame

The user opened a coaching task and saw a whisper that ran ~3
screens tall, with the SAME paragraph rendered in both the top
"WHISPER" panel and the first `ASSISTANT` box of the chat thread
below. Three issues compound:

1. **Architectural duplication.** `WhispererResponse` renders the
   most recent assistant turn at the top as a hero. `ChatThread`
   subscribes to `listByActivity` and renders every persisted turn,
   including the one already in the hero. Two zones, one shared
   data source, no de-duplication.
2. **Card-in-card-in-card nesting.** Task card → whisper container
   → per-turn bordered boxes. Each layer adds a border and padding;
   the cumulative effect reads as "AI dashboard chrome" rather than
   "coaching tool."
3. **Stacked uppercase labels.** WHISPER, ASSUMPTIONS, ASSISTANT,
   USER, ASSISTANT… alternate down the page in `text-[10-11px]
   uppercase tracking-wide`. Together they shout, regardless of
   how subtle each individual label looks in isolation.

The user reaction — "it makes the product look a bit busy" — is
the felt cost. The underlying cause is structural duplication +
chrome density. This plan attacks both.

---

## Requirements

- R1. The latest assistant turn must render exactly ONCE on screen, regardless of whether the chat sub-view is open or closed.
- R2. Per-turn bordered boxes are removed. Assistant and user turns differentiate via alignment, a subtle role chip, and spacing — no border on each turn.
- R3. The "WHISPER" uppercase header + lightbulb chrome at the top of the panel is removed. The orange-tinted container border already announces the AI surface.
- R4. The coaching summary's line measure is constrained to `max-w-prose` (~65ch) so paragraphs read as paragraphs, not banners.
- R5. The assumptions list defaults to COLLAPSED across all invocations (replacing the "first 5 invocations expanded" heuristic). A quiet inline link reveals it on demand.
- R6. The chat thread shows only the latest 2 turns by default after resume; an inline "show N earlier messages" toggle reveals the rest.
- R7. The X (close) icon swaps to a minimize-shape icon to match its actual semantics (preserves thread, doesn't discard).
- R8. The "start fresh" destructive action moves behind an overflow (⋯) menu so it's intentional but not first-glance prominent.
- R9. Resume hydration animates with a 180ms fade so the instant-render doesn't feel like a glitch.
- R10. The "3 of 10" turn counter relocates into the chat input row (or hides until turn 8+), reclaiming its current orphaned middle-of-the-page placement.
- R11. The whisper panel responds to its CONTAINER width (task card), not the viewport — so narrow task cards get a narrower whisper.

---

## Scope Boundaries

- Not redesigning the task card itself. The amber side-stripe on the task card is a pre-existing pattern across the Today page (not introduced by this plan).
- Not changing the backend or `respond` / `continueThread` action behavior. This is purely a render-layer plan.
- Not changing icon library (still Iconify `solar:*`).
- Not introducing animation libraries. CSS transitions + `prefers-reduced-motion` only.
- Not adding a settings toggle for "compact vs full" mode — pick a single default and ship it.

### Deferred to Follow-Up Work

- A proper design-token sweep across `src/components/whisperer/` (hard-coded `#1C1917`, `#1F1510`, `#D97757` → tokens). Larger project-wide change; defer.
- Chat-thread virtualization for very long histories. Today's 10-turn cap makes this unnecessary.
- A "share this whisper" feature — separate plan if pursued.

---

## Context & Research

### Relevant Code and Patterns

- `src/components/whisperer/WhispererResponse.js` — owns the hero rendering, the WHISPER header chrome, and the close/start-fresh buttons. Most of this plan lives here.
- `src/components/whisperer/ChatThread.js` — subscribes to `listByActivity`, renders the bordered turn boxes, hosts the input + soft-block banner.
- `src/components/whisperer/AssumptionsBlock.js` — `localStorage`-driven first-5-invocations default-expanded heuristic. Replaced by an always-collapsed default in this plan.
- `src/components/whisperer/HelpWithThisButton.js` — the resume path lives here (U2 of plan 2026-05-12-002). The fade-in lands here too.
- `src/components/knowledge/KnowledgeStatusCard.js` — the established "card with brand-orange border + lightbulb header" pattern. The whisper currently mirrors this. We DELIBERATELY diverge: KnowledgeStatusCard is a marketing card; the whisper is a working surface.

### Institutional Learnings

- `docs/solutions/2026-05-12-whisperer-resume-contract.md` — the multi-thread idempotency rule. None of the changes in this plan touch the storage layer, so no risk of regression there.

### External References

- Standard chat-transcript patterns (Claude, ChatGPT, Linear comments) — alignment + role dot + no per-message border. We mirror these here.

---

## Key Technical Decisions

- **Single timeline, not hero + list.** The cleanest fix for the duplication is to render ONE list of turns. The most-recent turn just happens to be the last (bottom) item. No separate "hero" branch. This deletes a render zone and the de-dup logic both — it removes complexity rather than adding a workaround.
- **`AssumptionsBlock` no longer reads `localStorage`.** The first-5-expanded heuristic was a guess; ship a single default-collapsed behavior. Removes a side-effect (localStorage write) that was already racy across tabs.
- **Container queries via `@container/whisperer`.** Modern browsers support these; no polyfill needed. Pair with a `container-type: inline-size` on the whisper panel so its internal layout responds to the task card width.
- **No animation library.** Resume fade-in is a single CSS opacity transition with `transform: translateY(2px)` for a touch of motion. `motion-reduce:transition-none` for accessibility.
- **Overflow menu uses native `<details>` element.** No portal, no JS focus trap; matches the lightweight philosophy of the rest of this surface.
- **Drop the "view recap" affordance variant.** Instead, the resume affordance handles all three loaded states (open with turns, capped, closed-→-fresh) via the same single-timeline render. The chat input is just disabled when the thread is capped.

---

## Open Questions

### Resolved During Planning

- *Should the chat input be visible by default in the unified timeline?* Yes. Once a user has invoked the whisper, the conversation is already live; treating "keep going" as a separate progressive-disclosure step adds a click without adding clarity. The input + send button live below the latest turn always.
- *Where does the artifact (draft) render in the unified timeline?* Inside its parent assistant turn, as today — a tinted sub-block with the copy button. Not a separate sibling.
- *Should "3 of 10" hide before turn 8?* Yes. The counter only acts as a warning signal near the cap; below that threshold it's metadata noise.

### Deferred to Implementation

- Exact role-dot styling (single character avatar vs colored dot vs neither) — choose during implementation by side-by-side comparison in the browser; the choice doesn't affect the data shape.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
BEFORE
┌─ task card ──────────────────────────────────────────┐
│  title, description, tags                             │
│  ┌─ whisper container ────────────────────────────┐  │
│  │  [💡 WHISPER]    [start fresh] [X]              │  │
│  │                                                  │  │
│  │  Latest coaching summary (full width)            │  │
│  │  ASSUMPTIONS: 5 (expanded list)                  │  │
│  │                                                  │  │
│  │  3 of 10                                         │  │
│  │  ┌─ ASSISTANT box ──────────────────────────┐   │  │
│  │  │ Latest coaching summary (DUPLICATE)       │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │  ┌─ USER box ───────────────────────────────┐   │  │
│  │  │ is it the right time to share new ideas? │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │  ┌─ ASSISTANT box ──────────────────────────┐   │  │
│  │  │ Earlier turn                              │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │  [keep going input]                              │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

AFTER
┌─ task card ──────────────────────────────────────────┐
│  title, description, tags                             │
│  ┌─ whisper container ────────────────────────────┐  │
│  │                                          [⋯][⊟] │  │
│  │  • Earlier assistant turn (collapsed by default,│  │
│  │    revealed by "show 1 earlier message")        │  │
│  │  • User: is it the right time to share ideas?   │  │
│  │  • Assistant: latest coaching summary           │  │
│  │    [↳ 5 notes]  [artifact block if present]     │  │
│  │  [ask a follow-up …]  [send]  3 of 10           │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

Width of the entire panel is constrained at `max-w-prose` (~65ch).
Per-turn turns differentiate via left-pad (assistant) vs right-pad
(user) and a tiny role chip; no per-turn borders.

---

## Implementation Units

- U1. **Unify hero + chat into a single conversation timeline**

**Goal:** Eliminate the duplicate-render bug by collapsing the two zones (hero summary + chat list) into one transcript. The latest assistant turn renders once, at the bottom of the list.

**Requirements:** R1, R6.

**Dependencies:** None.

**Files:**
- Modify: `src/components/whisperer/WhispererResponse.js` — replace the "if status ok then render hero + maybe ChatThread" branch with a single `<ConversationTimeline turns={turns} thread={thread} />` render. Keep all the status-not-ok branches (quota ceiling, fallback tip, small task tip) unchanged — they're not part of the conversational path.
- Create: `src/components/whisperer/ConversationTimeline.js` — pure presentational component. Takes the persisted turns + thread, renders them in `seq` order. Latest at the bottom. No per-turn border; differentiates by alignment + role chip. Hosts the chat input + send wiring (pulled from `ChatThread.js`).
- Modify: `src/components/whisperer/ChatThread.js` — slim down to a thin wrapper that just delegates to `ConversationTimeline`, OR delete it entirely and have callers use `ConversationTimeline` directly.
- Modify: `src/components/whisperer/HelpWithThisButton.js` — when invoking `respond` (fresh AI call), pass the result envelope to `WhispererResponse` AS BEFORE; the difference is `WhispererResponse` now uses the persisted turn list (synced via `listByActivity`) as the single source of truth and ignores `result.coachingSummary` for the transcript render (it can still be used for the loading / just-fired indicator).

**Approach:**
- Use the existing `useQuery(api.whispererThreads.listByActivity, { activityId })` subscription that `ChatThread` already has — just hoist it (or duplicate it) into the unified component.
- Render order: `turns.sort((a, b) => a.seq - b.seq)`. Map each to a `<TurnRow role={t.role} content={t.content} artifact={t.artifact} assumptions={t.assumptions} clarifyingQuestion={t.clarifyingQuestion} />`.
- "Show N earlier messages" toggle: when there are >2 turns, default-render only the last 2 plus a quiet button. Clicking expands. Use a small CSS-only collapse via `<details>` or React state — your call.
- Edge case: the `respond` action's result envelope arrives before the listByActivity reactivity catches up to the new turn. Optimistic: while `pending` or while the result envelope's turnId is not yet in `turns`, prepend a "just-fired" turn placeholder built from `result` so the user sees their content immediately. Convex reactivity catches up in <200ms typically; the placeholder gets replaced when it does.

**Patterns to follow:**
- `src/components/whisperer/ChatThread.js` — its current `listByActivity` subscription + turn rendering. Extract the chat input + send handler verbatim into `ConversationTimeline`.
- Standard chat-transcript layout (Claude / Linear comments) — alignment + spacing differentiates speakers, no border per message.

**Test scenarios:**
- Happy path: persisted thread with 3 turns → renders exactly 3 turn rows. The most recent one appears at the bottom.
- Happy path: 1 turn (one-shot coaching, no chat yet) → renders the single turn at the bottom; no "show N earlier" button.
- Edge case: 6 turns → only the latest 2 visible by default + "show 4 earlier messages" toggle. Clicking reveals all 6.
- Edge case: capped thread → the recap turn (last assistant) renders at the bottom; chat input is disabled with the `<SoftBlockBanner>` underneath.
- Edge case: optimistic placeholder — when `result.turnId` is set but not yet in `turns`, the placeholder renders. When `listByActivity` reactivity catches up, the placeholder is replaced by the persisted row (no duplicate, no flash).
- Integration: opening Task A's whisper after closing it shows the prior 3 turns immediately (R1 + the resume contract from the prior plan).

**Verification:**
- Visual: the latest assistant content appears exactly ONCE on screen.
- Test: persisted-turns rendering matches the conversation order (seq ascending top-to-bottom).

---

- U2. **Strip redundant chrome — uppercase labels, WHISPER header, per-turn borders**

**Goal:** Reduce visual weight so the conversation feels like a conversation, not an AI dashboard.

**Requirements:** R2, R3.

**Dependencies:** U1 (defines the new TurnRow component this unit styles).

**Files:**
- Modify: `src/components/whisperer/ConversationTimeline.js` — `TurnRow` is unstyled by border. Use:
  - Assistant turns: left-pad 0, normal text color.
  - User turns: indent right (e.g., `ml-8` or `pl-8 text-stone-300`).
  - Optional tiny role dot: a 4px `bg-[#D97757]` circle before the first line for assistant; nothing for user.
  - NO `border`, NO `bg-stone-900/60` per turn.
- Modify: `src/components/whisperer/WhispererResponse.js` — delete the header row that contains the lightbulb-in-tinted-box + "WHISPER" uppercase label. Keep the action buttons (now in an overflow menu — see U4) anchored top-right.

**Approach:**
- Single bordered container at the panel level — the existing `border border-[#D97757]/15 bg-stone-900/60 p-4`. Drop EVERY inner border on children.
- Role differentiation pattern (production examples to mimic): assistant text is the dominant column; user messages have lighter color `text-stone-400` and a small `↳` glyph or right-alignment. Pick during implementation.
- Visual rhythm: use `gap-4` between turns; no extra padding inside.

**Patterns to follow:**
- The Claude.ai web client and Linear's threaded comments — both eschew per-message borders.

**Test scenarios:**
- Test expectation: none — purely visual changes. Manual QA: take a screenshot after the change and compare to the before screenshot the user shared.

**Verification:**
- Visual: only one border visible per task card (the outer whisper container).
- Visual: no uppercase labels remain inside the whisper container (the WHISPER header is gone; ASSISTANT / USER labels are gone).

---

- U3. **Constrain typography + collapse assumptions by default**

**Goal:** Make the coaching read like a paragraph, not a banner. Move assumptions out of the user's face.

**Requirements:** R4, R5.

**Dependencies:** U1 (TurnRow is the rendering target).

**Files:**
- Modify: `src/components/whisperer/ConversationTimeline.js` (or wherever TurnRow lives) — wrap the assistant turn content in `<div className="max-w-prose">…</div>` so the line measure caps at ~65ch.
- Modify: `src/components/whisperer/AssumptionsBlock.js` — delete the localStorage-driven first-5-expanded heuristic. Replace with a single default-collapsed behavior. Replace the "ASSUMPTIONS: N" header with a small inline `<button>↳ {N} notes</button>` that toggles expanded.
- Modify: `src/components/whisperer/HelpWithThisButton.js` — delete the import + invocation of `bumpWhispererInvocationCount` (no longer needed). Delete the function from `AssumptionsBlock.js` if no other caller exists.

**Approach:**
- `max-w-prose` is Tailwind's `65ch` token — exactly the right reading measure for body text.
- Assumptions button copy: `↳ 5 notes` (the `↳` glyph visually telegraphs "supporting"). Style: `text-stone-500 text-[11px] hover:text-[#D97757]`. No icon needed.
- Empty assumptions array → render nothing (existing behavior).
- The localStorage key `whisperer_invocation_count` is harmless to leave behind — no migration needed.

**Patterns to follow:**
- `src/components/whisperer/AssumptionsBlock.js` already has the toggle state machine — just delete the `useEffect` that reads localStorage.

**Test scenarios:**
- Edge case: assumptions array is empty → component renders null (unchanged behavior, regression check).
- Happy path: assumptions present, default → collapsed with "↳ 3 notes" button. Click expands.
- Edge case: invocation count localStorage key is present from prior versions → silently ignored.

**Verification:**
- Visual: coaching summaries never wrap beyond ~65 characters per line.
- Visual: assumptions are never expanded on first render.

---

- U4. **Overflow menu for destructive actions + correct close-icon semantics**

**Goal:** Make minimize the obvious affordance; hide "start fresh" one tap deeper to match its destructive weight.

**Requirements:** R7, R8.

**Dependencies:** None.

**Files:**
- Modify: `src/components/whisperer/WhispererResponse.js` — the header right cluster becomes:
  - Quota chip (unchanged, conditionally rendered).
  - `<details className="…">` containing the `⋯` summary trigger + a small dropdown panel with "start fresh" as a single menu item. (Detail attribute reset CSS is well-known; we apply `[&::-webkit-details-marker]:hidden` or similar.)
  - Minimize button: same hit target, swap icon to `solar:minimize-square-linear` (or `solar:altitude-min-down-linear` — pick during implementation; both exist in the Solar icon set the rest of the app uses).

**Approach:**
- Native `<details>` keeps the JS surface minimal. Click-outside-to-close uses the browser's default behavior (it stays open until clicked again — acceptable for an internal menu).
- Microcopy in the menu: "Start fresh — discard this conversation". Slightly longer text inside the menu makes intent unambiguous.
- The bare X swap-to-minimize-icon is a 1-line change.

**Patterns to follow:**
- No existing overflow-menu pattern in the whisperer surface. `<details>` is the right primitive — it's how the app's `(legacy)` privacy + terms pages handle disclosure (verify; or use a hand-rolled small popover, but native `<details>` is cheaper).

**Test scenarios:**
- Happy path: click the `⋯` → menu opens; click "Start fresh" → behaves as today (closes thread server-side + emits whisperer_discarded + clears local state).
- Edge case: focus management — menu opens with keyboard focus; pressing Escape closes it (native `<details>` handles this).
- Test expectation: visual + interaction — none beyond a smoke walk-through.

**Verification:**
- Manual: minimize icon (X-equivalent) on first inspection reads as "minimize" not "close".
- Manual: "start fresh" requires exactly one extra tap to reach.

---

- U5. **Resume fade-in + container query + microcopy + counter relocation**

**Goal:** Smooth out the abrupt resume render, make the whisper responsive to its container width, and tighten the remaining microcopy.

**Requirements:** R9, R10, R11.

**Dependencies:** U1.

**Files:**
- Modify: `src/components/whisperer/WhispererResponse.js` — wrap the rendered panel in a div with `transition-opacity transition-transform duration-200 ease-out motion-reduce:transition-none` plus a `data-state="entered"` toggle driven by `useEffect(() => { requestAnimationFrame(() => setEntered(true)); }, [])`. Start at `opacity-0 translate-y-1`; end at `opacity-100 translate-y-0`.
- Modify: `src/components/whisperer/WhispererResponse.js` (or ConversationTimeline) — add `container-type: inline-size` via inline `style={{ containerType: 'inline-size' }}` on the outer panel. Use `@container (max-width: 480px)` style rules in a co-located `<style>` block or via the new Tailwind container-query plugin if it's already installed (check).
- Modify: `src/components/whisperer/ConversationTimeline.js` — the "3 of 10" counter renders inline-right-aligned next to the send button, in `text-[10px] text-stone-600`. Hide entirely when `turnCount < 8`.
- Modify: `src/components/whisperer/ChatThread.js` (or now ConversationTimeline) — chat input placeholder copy: `keep going…` → `ask a follow-up`.

**Approach:**
- The fade-in is intentionally subtle. 200ms is below the "feels animated" threshold for power users; above the "instant glitch" threshold for new users.
- Container query: if the Tailwind container-query plugin isn't installed, use a tiny inline `<style>` block scoped to the component. Either way, the rule is: at container widths below 480px, drop right-padding on the assistant turn and tighten gaps.

**Patterns to follow:**
- `src/components/whisperer/LoadingSkeleton.js` already animates via CSS classes; mirror the no-library, motion-reduce-aware approach.

**Test scenarios:**
- Happy path: resume click → panel fades in over 200ms.
- Edge case: `prefers-reduced-motion: reduce` → panel renders without transition (instant).
- Visual: at a 320px container width, the panel adapts (no horizontal scroll, content reflows).
- Happy path: turnCount=3 → no "3 of 10" rendered. turnCount=8 → "8 of 10" appears next to the send button.

**Verification:**
- Manual: open whisper, observe fade.
- Manual: resize the task list view (or open in mobile dev tools) and confirm the whisper does not overflow its task card.

---

## System-Wide Impact

- **Interaction graph:** Removing `ChatThread` (or thinning it to a wrapper) changes how `WhispererResponse` orchestrates the conversation. The unified component owns `listByActivity` + `continueThread` + `closeThread` interactions.
- **Error propagation:** Unchanged. Action-level errors still surface as typed envelopes.
- **State lifecycle risks:** The optimistic-placeholder in U1 introduces a one-tick state where the UI shows a synthetic turn before Convex reactivity replaces it. Test the de-dup carefully so the persisted turn doesn't briefly cause a double-render.
- **API surface parity:** No backend changes.
- **Integration coverage:** Manual smoke check across the eight states from plan 002's U4 verification still passes.
- **Unchanged invariants:** Thread + turn schemas, `respond` / `continueThread` action behavior, the resume contract documented in `docs/solutions/2026-05-12-whisperer-resume-contract.md`.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Optimistic placeholder briefly duplicates a persisted turn during the Convex reactivity gap. | De-dup key by `turnId` if present, otherwise by `seq` + `role` + `content`. Drop the placeholder as soon as a turn with the same `turnId` appears in the persisted list. |
| `<details>` menu styling differs across browsers (Safari adds a default disclosure triangle). | Use `details > summary::-webkit-details-marker { display: none; }` and `details > summary::marker { display: none; }` reset CSS in a co-located `<style>` block. Verified pattern. |
| Container query syntax not yet supported in older WebKit. | The targeted user base is on evergreen browsers (Convex + Next 16 already require this). No polyfill. |
| Visual change feels jarring to existing users who got used to the current layout. | Polish is non-destructive — no data shape changes. If the redesign needs revisions, revert is `git revert` of these 5 commits. |

---

## Documentation / Operational Notes

- Update `docs/solutions/2026-05-12-whisperer-resume-contract.md` after U1 lands to reference the unified-timeline component instead of the dual-zone hero+chat split.
- No new env vars, no migrations.

---

## Sources & References

- **Origin doc:** `docs/brainstorms/2026-05-12-arcora-ai-whisperer-requirements.md`
- **Parent plans:** `docs/plans/2026-05-12-001-feat-arcora-ai-task-whisperer-plan.md`, `docs/plans/2026-05-12-002-feat-whisperer-resume-conversation-plan.md`
- **Related solution note:** `docs/solutions/2026-05-12-whisperer-resume-contract.md`
- Polish / impeccable principle references (loaded via skill invocation): line-measure cap, anti-AI-slop chrome reduction, single-timeline chat pattern, container queries for component-scoped responsive layout.
