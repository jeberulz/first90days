// Read-only helper that reports the user's *remaining* daily AI budget as
// a whisperer-call count estimate. Reads the **full shared cents ledger**
// (all OP_COSTS combined, not just whisperer-tagged rows) and subtracts
// from the user's tier ceiling, so the count reflects what the user can
// actually do given everything else they may have already spent on today.
//
// IMPORTANT: this is an informational estimate, NOT a contract. Background
// AI ops (KB enrichment, weekly insights, etc.) can fire concurrently and
// shift the count between read and reservation. UI should treat it as a
// soft signal; the authoritative gating happens inside reserveBudget /
// reserveWithEnvelope on the next user-initiated call.

import {
  OP_COSTS,
  getDailySpendCents,
  tierCeilingCents,
} from "./rateLimit.js";

/**
 * Compute the remaining whisperer-call estimate for a user.
 *
 * @param {object} ctx - Convex query/mutation context.
 * @param {string} userId - The user's Convex id.
 * @returns {Promise<{
 *   tier: string,
 *   ceiling_cents: number,
 *   used_cents: number,
 *   remaining_cost: number,
 *   remaining_whisperer_calls_est: number,
 * }>}
 */
export async function remainingFromCents(ctx, userId) {
  const user = await ctx.db.get(userId);
  const tier = user?.billingTier ?? "free";
  const ceiling = tierCeilingCents(tier);
  const used = await getDailySpendCents(ctx, userId);
  const remaining = Math.max(0, ceiling - used);
  return {
    tier,
    ceiling_cents: ceiling,
    used_cents: used,
    remaining_cost: remaining,
    remaining_whisperer_calls_est: Math.floor(remaining / OP_COSTS.whisperer),
  };
}
