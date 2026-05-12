import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * One-time backfill for stakeholders.firstMentionedAt.
 *
 * Sets firstMentionedAt = _creationTime for every stakeholder row that
 * doesn't already have it set. This is a BEST-EFFORT lower bound: the
 * stakeholder may have been first mentioned in a chat or interaction
 * earlier than they were materialised in the stakeholders table — we
 * don't have origin data for legacy rows, so we use _creationTime as
 * the closest available approximation. Required for U8's compound-payoff
 * metric ("Arcora remembered something I mentioned weeks ago").
 *
 * Run:
 *   # Preview without writing:
 *   npx convex run migrations/backfillStakeholderFirstMentionedAt:run '{"dryRun": true}'
 *
 *   # Apply:
 *   npx convex run migrations/backfillStakeholderFirstMentionedAt:run '{}'
 *
 * Idempotent — rows where firstMentionedAt is already set are left
 * alone, so running twice produces the same end state.
 *
 * Single-pass scan with `take(batchSize)` (default 200). The v1 user
 * base fits in one batch; if the stakeholders table grows past
 * `batchSize` this will need a cursored scan + self-reschedule (see
 * `purgeUserData` for the pattern) — currently it would silently leave
 * rows past the first batch un-backfilled because there is no index on
 * `firstMentionedAt` to skip already-set rows.
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { dryRun, batchSize }) => {
    const preview = dryRun ?? false;
    const size = Math.max(1, Math.min(500, batchSize ?? 200));

    // We scan the table; there's no index on firstMentionedAt so the
    // cheapest approach is a bounded take + filter-in-memory. The
    // table is small (one row per stakeholder per user) so a single
    // pass usually finishes in one batch.
    const rows = await ctx.db.query("stakeholders").take(size);

    let scanned = 0;
    let backfilled = 0;
    let alreadySet = 0;

    for (const row of rows) {
      scanned += 1;
      if (row.firstMentionedAt !== undefined) {
        alreadySet += 1;
        continue;
      }
      if (!preview) {
        await ctx.db.patch(row._id, {
          firstMentionedAt: row._creationTime,
        });
      }
      backfilled += 1;
    }

    return {
      scanned,
      backfilled,
      alreadySet,
      dryRun: preview,
      // Note: callers re-run until backfilled === 0 to handle large
      // tables. Single pass is sufficient for the v1 user base.
    };
  },
});
