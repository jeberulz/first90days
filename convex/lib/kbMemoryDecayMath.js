/**
 * Pure helpers for the memory feedback loop (Priority 5).
 *
 * Kept in its own file (no Convex ctx, no DB) so the decay math and the
 * confidence-boost math can be unit-tested without needing to stand up a
 * Convex deployment in the test runner.
 *
 * Two public helpers:
 *
 *   computeDecayedConfidence({...})
 *     Given a memory's current confidence + last-used timestamp, return
 *     the confidence it *should* have if we applied `MEMORY_WEEKLY_DECAY`
 *     for every full week the memory has gone unused past
 *     `unusedThresholdDays`. Idempotent via `lastDecayedAt`: if the memory
 *     was already decayed recently we won't decay it again within the
 *     same window.
 *
 *   applyUsageBoost({...})
 *     Given a current confidence and a boost amount, return the new
 *     clamped-to-1.0 confidence. Handles both implicit and explicit
 *     boosts — the caller picks the amount from kbRetrievalConfig.
 */

const DAY_MS = 1000 * 60 * 60 * 24;
const WEEK_MS = 7 * DAY_MS;

/**
 * @param {Object} args
 * @param {number} args.confidence - current confidence in [0,1].
 * @param {number} [args.lastUsedAt] - ms since epoch of last prompt injection.
 * @param {number} [args.lastDecayedAt] - ms since epoch of last decay tick.
 * @param {number} args.creationTime - ms since epoch the memory was created.
 * @param {number} args.nowMs - injected clock.
 * @param {number} args.weeklyDecay - multiplier per week (e.g. 0.95).
 * @param {number} args.unusedThresholdDays - days of disuse before decay starts.
 * @param {number} [args.floor=0] - confidence won't be decayed below this.
 * @returns {{newConfidence: number, weeksApplied: number, changed: boolean}}
 */
export function computeDecayedConfidence({
  confidence,
  lastUsedAt,
  lastDecayedAt,
  creationTime,
  nowMs,
  weeklyDecay,
  unusedThresholdDays,
  floor = 0,
}) {
  const c = clamp01(confidence ?? 0);
  // Anchor disuse from the most recent of (lastUsedAt, creationTime).
  // Without a lastUsedAt stamp, a brand-new memory is "unused" for
  // (now - creationTime) which is 0 right after insert — correct.
  const anchor = Math.max(lastUsedAt ?? 0, creationTime ?? 0);
  const disuseDays = Math.max(0, (nowMs - anchor) / DAY_MS);

  if (disuseDays < unusedThresholdDays) {
    return { newConfidence: c, weeksApplied: 0, changed: false };
  }

  // Weeks of disuse past the threshold, capped by ticks already applied
  // in the last decay window. If we already decayed < 7 days ago, skip —
  // we don't double-tick within a window.
  if (lastDecayedAt && nowMs - lastDecayedAt < WEEK_MS) {
    return { newConfidence: c, weeksApplied: 0, changed: false };
  }

  // How many weeks have passed since the last decay tick (or since the
  // unused-threshold crossover, whichever is more recent). This is the
  // cron-catch-up case: if the cron was offline for 3 weeks we apply 3
  // ticks in one run.
  const lastTick = Math.max(
    lastDecayedAt ?? 0,
    anchor + unusedThresholdDays * DAY_MS
  );
  const weeksSinceLastTick = Math.floor((nowMs - lastTick) / WEEK_MS);
  if (weeksSinceLastTick <= 0) {
    // Crossed the threshold but not a full week past it yet — no-op.
    return { newConfidence: c, weeksApplied: 0, changed: false };
  }

  // Apply weeklyDecay^weeks, then floor.
  const rawDecayed = c * Math.pow(weeklyDecay, weeksSinceLastTick);
  const floored = Math.max(floor, rawDecayed);
  return {
    newConfidence: floored,
    weeksApplied: weeksSinceLastTick,
    changed: floored < c - 1e-9,
  };
}

/**
 * Apply an additive confidence boost (implicit or explicit), clamped to
 * [0, 1]. Never subtracts — dismiss is handled as a status change, not a
 * negative boost.
 *
 * @param {Object} args
 * @param {number} args.confidence - current confidence in [0,1].
 * @param {number} args.boost - amount to add (e.g. MEMORY_IMPLICIT_BOOST).
 * @returns {number}
 */
export function applyUsageBoost({ confidence, boost }) {
  const c = clamp01(confidence ?? 0);
  const b = Math.max(0, boost ?? 0);
  return clamp01(c + b);
}

function clamp01(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
