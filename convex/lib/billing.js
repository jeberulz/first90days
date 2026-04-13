export const TRIAL_DAYS = 14;
export const FREE_DAILY_ENRICHMENT_CAP = 5;
export const PRO_DAILY_ENRICHMENT_CAP = 100;
export const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

export const BILLING_TIERS = {
  FREE: "free",
  PRO: "pro",
  PRO_LEGACY: "pro_legacy",
};

const PRO_TIER_SET = new Set([BILLING_TIERS.PRO, BILLING_TIERS.PRO_LEGACY]);

export function isProTier(tier) {
  return PRO_TIER_SET.has(tier);
}

export function capForTier(tier) {
  return isProTier(tier) ? PRO_DAILY_ENRICHMENT_CAP : FREE_DAILY_ENRICHMENT_CAP;
}

/**
 * Compute the enrichment quota state for a single runEnrich invocation.
 * Pure function — inputs describe the current world, output describes the
 * decision. Callers handle the DB writes (reset/increment/skip).
 *
 * Inputs:
 *   - tier: billing tier, used to pick the daily cap
 *   - kbSettings: user.settings.kb object (or undefined)
 *   - todayYmd: today's date string in the user's timezone (YYYY-MM-DD)
 *
 * Outputs:
 *   - cap: daily cap for this tier
 *   - usedToday: effective used count AFTER applying a same-day reset
 *   - resetNeeded: true if the persisted resetDate is stale and we should
 *     write a new reset row before running enrichment
 *   - overCap: true if usedToday has already hit the cap
 */
export function computeQuotaState({ tier, kbSettings, todayYmd }) {
  const cap = capForTier(tier);
  const kb = kbSettings ?? {};
  const resetNeeded = kb.enrichmentBudgetResetDate !== todayYmd;
  const usedToday = resetNeeded
    ? 0
    : (kb.enrichmentBudgetUsedToday ?? 0);
  return {
    cap,
    usedToday,
    resetNeeded,
    overCap: usedToday >= cap,
  };
}

/**
 * Derive billing tier from user + subscription state at read time.
 * Pure function — webhook may drop events, so we never trust a cached flag alone.
 * pro_legacy always wins: grandfathered users never lose Pro, regardless of Stripe state.
 */
export function deriveTier(user, sub, nowMs) {
  if (user?.billingTier === BILLING_TIERS.PRO_LEGACY) {
    return BILLING_TIERS.PRO_LEGACY;
  }
  if (!sub) return BILLING_TIERS.FREE;

  const { status, currentPeriodEnd, cancelAtPeriodEnd } = sub;

  if (status === "trialing" || status === "active") {
    return BILLING_TIERS.PRO;
  }
  if (status === "canceled" && currentPeriodEnd > nowMs) {
    return BILLING_TIERS.PRO;
  }
  if (status === "past_due" && currentPeriodEnd + GRACE_PERIOD_MS > nowMs) {
    return BILLING_TIERS.PRO;
  }
  return BILLING_TIERS.FREE;
}
