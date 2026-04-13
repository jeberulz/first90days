import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  MEMORY_WEEKLY_DECAY,
} from "./lib/kbRetrievalConfig.js";
import { computeDecayedConfidence } from "./lib/kbMemoryDecayMath.js";

/**
 * Priority 5 — weekly memory decay cron.
 *
 * Walks every active memory and applies the per-week confidence decay
 * defined in kbRetrievalConfig. Memories that have been used recently
 * (lastUsedAt within `UNUSED_THRESHOLD_DAYS`) are skipped; memories that
 * have gone unused past the threshold get `MEMORY_WEEKLY_DECAY` applied
 * once per full week of disuse. The decay floor + the "hide when under
 * floor" logic live in internal.kbInternal.applyMemoryDecay.
 *
 * The heavy lifting — the math — lives in lib/kbMemoryDecayMath.js so
 * it's unit-tested without requiring a Convex deployment. This file is
 * the thin glue that owns the cron trigger, iterates the DB, and posts
 * mutations for each changed row.
 *
 * Idempotent: `lastDecayedAt` is set on every processed memory, so if
 * the cron runs twice in one week no second tick will apply.
 *
 * Trigger (besides the cron): `npx convex run kbMemoryDecay:runDecayNow`.
 */

/** Days of disuse before decay starts. */
const UNUSED_THRESHOLD_DAYS = 30;

/** Confidence below which a memory gets hidden from the visible stream. */
const HIDE_FLOOR = 0.2;

/** Hard floor — confidence never decays below this even if weeks stack up. */
const DECAY_FLOOR = 0.05;

/** Max memories scanned per run. Raise if we grow past this per cron cycle. */
const SCAN_LIMIT = 5000;

export const runDecayNow = internalAction({
  args: {},
  handler: async (ctx) => {
    const nowMs = Date.now();
    const memories = await ctx.runQuery(
      internal.kbInternal.listActiveMemoriesForDecay,
      { limit: SCAN_LIMIT }
    );

    let scanned = 0;
    let decayed = 0;
    let hidden = 0;

    for (const m of memories) {
      scanned++;
      const result = computeDecayedConfidence({
        confidence: m.confidence ?? 0,
        lastUsedAt: m.lastUsedAt,
        lastDecayedAt: m.lastDecayedAt,
        creationTime: m._creationTime,
        nowMs,
        weeklyDecay: MEMORY_WEEKLY_DECAY,
        unusedThresholdDays: UNUSED_THRESHOLD_DAYS,
        floor: DECAY_FLOOR,
      });
      if (!result.changed) continue;

      decayed++;
      if (
        result.newConfidence <= HIDE_FLOOR &&
        m.visibleInStream
      ) {
        hidden++;
      }
      await ctx.runMutation(internal.kbInternal.applyMemoryDecay, {
        memoryId: m._id,
        newConfidence: result.newConfidence,
        nowMs,
        hideFloor: HIDE_FLOOR,
      });
    }

    return { scanned, decayed, hidden };
  },
});
