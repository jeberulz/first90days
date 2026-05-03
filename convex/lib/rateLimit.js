// Per-user daily AI cost ceiling. Cheap insurance against a single account
// (or a single bug) draining OpenAI/Anthropic credits on launch day.
//
// Costs are tracked in CENTS (USD equivalent) on the `aiUsage` table,
// keyed by userId + UTC day. Ceilings below are upper bounds; well-behaved
// users will never come close. The point is to put a roof on abuse.

import { ConvexError } from "convex/values";

// Tier ceilings, cents per UTC day. Tune these as real cost data lands.
const DAILY_LIMITS_CENTS = {
  free: 200, // ≈ $2/day
  pro: 1500, // ≈ $15/day
  pro_legacy: 1500,
};

// Estimated cost in cents for each named operation. We charge UP FRONT
// (pessimistic estimate) so a long-running request can't burn through the
// limit before recording itself. Tune by observing real cost.
export const OP_COSTS = {
  generatePlan: 100, // ~$1 of Claude/GPT-4o for a full plan
  generateDrafts: 60, // company research draft
  suggestActivities: 30,
  generateWeeklyInsight: 30,
  semanticSearch: 5, // embedding-only
  kbEnrich: 20,
  kbEmbed: 5,
};

function utcDayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function ceilingFor(tier) {
  return DAILY_LIMITS_CENTS[tier] ?? DAILY_LIMITS_CENTS.free;
}

/**
 * Atomically check the user's daily budget and reserve cost up front.
 * Throws ConvexError if the reservation would exceed the ceiling.
 *
 * Call from a mutation context. Actions should call via
 * `ctx.runMutation(internal.lib_rateLimit.reserve, ...)` before invoking
 * any AI provider.
 */
export async function reserveBudget(ctx, userId, costCents) {
  const dayKey = utcDayKey();
  const user = await ctx.db.get(userId);
  const tier = user?.billingTier ?? "free";
  const ceiling = ceilingFor(tier);

  const existing = await ctx.db
    .query("aiUsage")
    .withIndex("by_user_day", (q) =>
      q.eq("userId", userId).eq("dayKey", dayKey)
    )
    .unique();

  const current = existing?.costCents ?? 0;
  if (current + costCents > ceiling) {
    throw new ConvexError(
      `Daily AI usage limit reached on the ${tier} plan. Try again tomorrow or upgrade for a higher ceiling.`
    );
  }

  if (existing) {
    await ctx.db.patch(existing._id, {
      costCents: current + costCents,
      requestCount: (existing.requestCount ?? 0) + 1,
      lastRequestAt: Date.now(),
    });
  } else {
    await ctx.db.insert("aiUsage", {
      userId,
      dayKey,
      costCents,
      requestCount: 1,
      lastRequestAt: Date.now(),
    });
  }
}

/**
 * Adjust the reservation downward (or upward) once the real cost is known.
 * Optional — reservations are pessimistic, so skipping this just means a
 * small overcount.
 */
export async function reconcileBudget(ctx, userId, deltaCents) {
  if (!deltaCents) return;
  const dayKey = utcDayKey();
  const existing = await ctx.db
    .query("aiUsage")
    .withIndex("by_user_day", (q) =>
      q.eq("userId", userId).eq("dayKey", dayKey)
    )
    .unique();
  if (!existing) return;
  await ctx.db.patch(existing._id, {
    costCents: Math.max(0, existing.costCents + deltaCents),
    lastRequestAt: Date.now(),
  });
}
