---
title: Whisperer resume contract + multi-thread idempotency
date: 2026-05-12
tags: [whisperer, convex, ui-state, idempotency]
related_plan: docs/plans/2026-05-12-002-feat-whisperer-resume-conversation-plan.md
---

# Whisperer resume contract + multi-thread idempotency

After the v1 whisperer shipped, every "help with this" click fired a
fresh `respond` action — even on a task the user had just walked
away from. The data was on disk (`whispererThreads` + `whispererTurns`
from U3) but the UI wasn't reading it on reopen. This note captures
the contract we landed and the one-line idempotency rule that's easy
to revert by accident.

## UI states the affordance must distinguish

| Server state                            | Button label       | Click action                        |
| --------------------------------------- | ------------------ | ----------------------------------- |
| No thread for activity                  | help with this     | call `respond` (fresh AI invocation)|
| Open thread, has assistant turn         | resume whisper     | hydrate from `envelopeFromTurns` — no AI call |
| Capped thread (turn limit / cents cap)  | view recap         | hydrate from `envelopeFromTurns` — SoftBlockBanner renders |
| Closed thread (user pressed start fresh)| help with this     | call `respond` — mints a NEW thread |

`whispererThreads.listByActivity` is the single source of truth.
It hides closed threads (returns null so the affordance reverts)
and returns the most recent open OR capped thread otherwise.

## The X is minimize, not discard

Two distinct actions live in the response header:

- **X (close icon, top right):** minimize. Clears local state only.
  Thread stays on disk so the next render shows "resume". No
  telemetry — dismissing is not a signal worth measuring.
- **"start fresh" (refresh icon, lower prominence):** explicit
  discard. Calls `whispererThreads.closeThread` AND
  `whispererTelemetry.markDiscarded`. Both fire-and-forget.

Users intuitively read the X as "I'm done for now, save my place".
Returning to a sterile blank "help with this" after a close was the
surprise that motivated this plan.

## Idempotency rule that's easy to revert

Every thread lookup against `whispererThreads.by_user_activity`
must filter on `status` — never `.unique()`. There can now be
multiple thread rows for the same `(userId, activityId)` pair
because the start-fresh flow leaves prior threads closed.

Lookups split into two patterns:

- **"Find the active thread"** (`finalizeRespond`, `createThread`):
  `.filter(q => q.eq(q.field("status"), "open")).order("desc").first()`.
  If none exists, insert a new open row.
- **"Find the most recent visible thread"** (`listByActivity`,
  `getByActivity`, `emitTaskCompleteAcceptIfRecent`):
  `.filter(q => q.neq(q.field("status"), "closed")).order("desc").first()`.

Reverting any of these to `.unique()` will throw at runtime as soon
as a user uses "start fresh" twice. The tests in
`convex/whispererThreads.test.js` cover this directly — keep them
passing.

## Why no denormalized "last envelope" on the thread row

Tempting to store a copy of the last response envelope on the
thread row so resume reads one document. We rejected this:

- The turn row already carries every UI-relevant field
  (`content`, `artifact`, `assumptions`, `clarifyingQuestion`).
- A denormalized copy would drift if anyone later patches a turn.
- The reactive `listByActivity` query already returns turns, so the
  client cost is unchanged.

`envelopeFromTurns(thread, turns)` is the projection function. It
infers `path` from the persisted turn fields (artifact → hybrid,
clarifyingQuestion → clarify, short coaching → small). The
classifier decision lives in `planEventLog` if exact replay is
ever needed; the UI doesn't surface it, so omission is harmless.
