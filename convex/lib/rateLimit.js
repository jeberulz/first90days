// Per-user daily AI cost ceiling. Cheap insurance against a single account
// (or a single bug) draining OpenAI/Anthropic credits on launch day.
//
// Costs are tracked in CENTS (USD equivalent) on the `aiUsage` table,
// keyed by userId + day. The day key is user-local timezone aware (default
// Europe/London) when the WHISPERER_V1_AIUSAGE_TIMEZONE_KEY flag is enabled;
// otherwise it falls back to the legacy UTC day key for backwards compat.
//
// Ceilings below are upper bounds; well-behaved users will never come close.
// The point is to put a roof on abuse.

import { ConvexError } from "convex/values";
import { DEFAULT_TIMEZONE, resolveUserTimezone } from "./planDates.js";

// Tier ceilings, cents per day. Tune these as real cost data lands.
const DAILY_LIMITS_CENTS = {
  free: 200, // ≈ $2/day
  pro: 1500, // ≈ $15/day
  pro_legacy: 1500,
};

// Per-day request-count caps, intended as a coarse abuse signal that fires
// independently of the cents ledger. A user who churns through cheap ops
// (e.g. semantic search at 5¢ each) can hit the count cap before the cents
// ceiling; surfacing `over_count` distinguishes that from `over_cents` so
// the UI can speak to the actual constraint.
const DAILY_COUNT_CAPS = {
  free: 30,
  pro: 200,
  pro_legacy: 200,
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
  // Whisperer ops (U1). 15¢ covers Claude Sonnet on a ~600-token prompt +
  // ~250-token response with comfortable headroom. whisperer_recap is the
  // soft-cap-recovery turn at end of a chat (free, no provider call).
  // whisperer_semantic is the Haiku fire-and-forget classifier — billed
  // for attribution even though tiny.
  whisperer: 15,
  whisperer_recap: 0,
  whisperer_semantic: 1,
};

// Feature flag — controls the user-local day-key transition. Read from the
// process env so tests + Convex actions can flip it without redeploying
// rateLimit.js. Separate from `WHISPERER_V1_ENABLED` so the day-key change
// can ship cross-feature ahead of the whisperer itself.
function timezoneFlagEnabled() {
  return (
    typeof process !== "undefined" &&
    process?.env?.WHISPERER_V1_AIUSAGE_TIMEZONE_KEY === "true"
  );
}

// 48-hour dual-read transition window after the flag flips on. During this
// window reservations sum spend from BOTH the legacy utcDayKey row AND the
// new userDayKey row so we never silently double-count NOR miss spend that
// was recorded under the previous key for the same logical user-day. After
// 48 hours a backfill rewrites prior-day rows under userDayKey and the
// dual-read can be retired.
const DUAL_READ_WINDOW_MS = 48 * 60 * 60 * 1000;

function dualReadEnabled(now = Date.now()) {
  if (!timezoneFlagEnabled()) return false;
  const enabledAtRaw =
    typeof process !== "undefined"
      ? process?.env?.WHISPERER_V1_AIUSAGE_TIMEZONE_KEY_ENABLED_AT
      : undefined;
  const enabledAt = Number(enabledAtRaw);
  if (!Number.isFinite(enabledAt) || enabledAt <= 0) {
    // No deploy timestamp configured → assume we are still inside the
    // window (safer than skipping it on the first run).
    return true;
  }
  return now - enabledAt < DUAL_READ_WINDOW_MS;
}

/**
 * Legacy UTC-day key. Kept exported so callers that have not yet migrated
 * (and the dual-read transition path) can compute it directly.
 */
export function utcDayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Validate that a timezone string is something Intl.DateTimeFormat accepts.
 * Returns the validated tz, or DEFAULT_TIMEZONE when missing/invalid.
 * Surfaces a console.warn for the latter so operators can clean up the
 * settings row later.
 */
export function safeTimezone(tz) {
  if (typeof tz !== "string" || tz.length === 0) return DEFAULT_TIMEZONE;
  try {
    // Intl throws RangeError on unknown zones.
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    console.warn(`[rateLimit] invalid timezone "${tz}", falling back to ${DEFAULT_TIMEZONE}`);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * User-local-day key. Reads `settings.timezone` on the user record and
 * formats as YYYY-MM-DD in that zone. Defaults to Europe/London on missing
 * or invalid zones (Intl throws → fallback).
 *
 * Async because it reads the user row. Callers in a mutation context can
 * pass the already-loaded user object via `precomputedUser` to skip the
 * extra db.get round-trip.
 */
export async function userDayKey(ctx, userId, now = Date.now(), precomputedUser = null) {
  const user = precomputedUser ?? (await ctx.db.get(userId));
  const tz = safeTimezone(resolveUserTimezone(user));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function ceilingFor(tier) {
  return DAILY_LIMITS_CENTS[tier] ?? DAILY_LIMITS_CENTS.free;
}

function countCapFor(tier) {
  return DAILY_COUNT_CAPS[tier] ?? DAILY_COUNT_CAPS.free;
}

export function tierCeilingCents(tier) {
  return ceilingFor(tier);
}

export function tierCountCap(tier) {
  return countCapFor(tier);
}

/**
 * Read the day-keyed aiUsage row for a user, transparently summing the
 * dual-read transition window when active. Returns
 * { currentCents, currentCount, primary, primaryKey, dualRow } so callers
 * can patch the right row (or insert a new one) without re-querying.
 */
async function readUsage(ctx, userId, now) {
  const useTz = timezoneFlagEnabled();
  const tzKey = useTz ? await userDayKey(ctx, userId, now) : null;
  const utcKey = utcDayKey(now);

  // Primary write key. When the tz flag is on we always write to the
  // user-local key. When it's off we write to the legacy UTC key.
  const primaryKey = useTz ? tzKey : utcKey;
  const dualRead = useTz && dualReadEnabled(now) && tzKey !== utcKey;

  const primary = await ctx.db
    .query("aiUsage")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayKey", primaryKey))
    .unique();

  let dualRow = null;
  if (dualRead) {
    dualRow = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayKey", utcKey))
      .unique();
  }

  const currentCents = (primary?.costCents ?? 0) + (dualRow?.costCents ?? 0);
  const currentCount =
    (primary?.requestCount ?? 0) + (dualRow?.requestCount ?? 0);

  return {
    currentCents,
    currentCount,
    primary,
    primaryKey,
    dualRow,
  };
}

/**
 * Atomically check the user's daily budget and reserve cost up front.
 *
 * Throws ConvexError on cents-ceiling violation so existing call sites
 * (generatePlan etc.) keep their existing behaviour. For the typed error
 * envelope, use {@link reserveWithEnvelope}.
 *
 * Call from a mutation context.
 */
export async function reserveBudget(ctx, userId, costCents) {
  const result = await reserveWithEnvelope(ctx, userId, costCents);
  if (result.status === "over_cents" || result.status === "over_count") {
    const tier = result.tier;
    throw new ConvexError(
      result.status === "over_count"
        ? `Daily AI request count reached on the ${tier} plan. Try again tomorrow or upgrade for a higher ceiling.`
        : `Daily AI usage limit reached on the ${tier} plan. Try again tomorrow or upgrade for a higher ceiling.`
    );
  }
}

/**
 * Same atomic reservation, but returns a structured envelope describing
 * which constraint (if any) blocked the reservation. Used by whisperer
 * code paths that want to differentiate over_count, over_cents, and
 * provider_unavailable in the UI.
 *
 * Returns:
 *   {
 *     status: "ok" | "over_count" | "over_cents" | "provider_unavailable",
 *     tier: <string>,
 *     remaining_cost: <number, cents still available after the reservation
 *                      would have applied — clamped >= 0>,
 *     remaining_whisperer_calls_est: <number, floor(remaining_cost / 15)>,
 *     mid_thread_cents_capped?: <boolean, set by chat-thread paths when
 *                                  the soft cents cap fires mid-thread>,
 *   }
 */
export async function reserveWithEnvelope(ctx, userId, costCents, options = {}) {
  const now = Date.now();
  const user = await ctx.db.get(userId);
  const tier = user?.billingTier ?? "free";
  const ceiling = ceilingFor(tier);
  const countCap = countCapFor(tier);

  const { currentCents, currentCount, primary, primaryKey } =
    await readUsage(ctx, userId, now);

  const wouldBeCents = currentCents + costCents;
  const wouldBeCount = currentCount + 1;

  // Order: cents binding always wins (cents ledger is authoritative).
  // If only the count cap is exceeded we surface over_count so the UI can
  // distinguish abuse-signal from cost-ceiling.
  if (wouldBeCents > ceiling) {
    const remaining = Math.max(0, ceiling - currentCents);
    return {
      status: "over_cents",
      tier,
      remaining_cost: remaining,
      remaining_whisperer_calls_est: Math.floor(remaining / OP_COSTS.whisperer),
      ...(options.midThread ? { mid_thread_cents_capped: true } : {}),
    };
  }
  if (wouldBeCount > countCap) {
    const remaining = Math.max(0, ceiling - currentCents);
    return {
      status: "over_count",
      tier,
      remaining_cost: remaining,
      remaining_whisperer_calls_est: Math.floor(remaining / OP_COSTS.whisperer),
    };
  }

  // Reservation is allowed — record it. We always write to the primary
  // (user-local when flag on, UTC when off). Dual-read rows are READ but
  // never updated by new reservations; they're for transitional summing
  // only and decay naturally after the 48h window.
  if (primary) {
    await ctx.db.patch(primary._id, {
      costCents: (primary.costCents ?? 0) + costCents,
      requestCount: (primary.requestCount ?? 0) + 1,
      lastRequestAt: now,
    });
  } else {
    await ctx.db.insert("aiUsage", {
      userId,
      dayKey: primaryKey,
      costCents,
      requestCount: 1,
      lastRequestAt: now,
    });
  }

  const remaining = Math.max(0, ceiling - wouldBeCents);
  return {
    status: "ok",
    tier,
    remaining_cost: remaining,
    remaining_whisperer_calls_est: Math.floor(remaining / OP_COSTS.whisperer),
  };
}

/**
 * Adjust the reservation downward (or upward) once the real cost is known.
 * Optional — reservations are pessimistic, so skipping this just means a
 * small overcount.
 *
 * Writes to the same primary row that reserveBudget would target today,
 * which is the user-local-day row when the flag is enabled (otherwise the
 * legacy UTC row). The dual-read sum is NOT mutated here.
 */
export async function reconcileBudget(ctx, userId, deltaCents) {
  if (!deltaCents) return;
  const now = Date.now();
  const useTz = timezoneFlagEnabled();
  const primaryKey = useTz ? await userDayKey(ctx, userId, now) : utcDayKey(now);
  const existing = await ctx.db
    .query("aiUsage")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayKey", primaryKey))
    .unique();
  if (!existing) return;
  await ctx.db.patch(existing._id, {
    costCents: Math.max(0, existing.costCents + deltaCents),
    lastRequestAt: now,
  });
}

/**
 * Internal helper exposed for tests + the whispererQuota module: returns
 * the current total spend (cents) under the active day key, including the
 * dual-read sum when applicable.
 */
export async function getDailySpendCents(ctx, userId, now = Date.now()) {
  const { currentCents } = await readUsage(ctx, userId, now);
  return currentCents;
}
