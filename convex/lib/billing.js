const DAY_MS = 24 * 60 * 60 * 1000;

export const TRIAL_DAYS = 7;
export const LOCAL_TRIAL_MS = TRIAL_DAYS * DAY_MS;
export const FREE_DAILY_ENRICHMENT_CAP = 5;
export const PRO_DAILY_ENRICHMENT_CAP = 100;
export const GRACE_PERIOD_MS = 3 * DAY_MS;

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
 *
 * Local trial: when there is no Stripe subscription but the user has started a
 * local (no-card) trial via billing.startLocalTrial, user.trialUsedAt holds the
 * trial start timestamp. The user gets PRO until trialUsedAt + LOCAL_TRIAL_MS.
 * Once a Stripe subscription exists, the sub-driven branches below take over —
 * trialUsedAt continues to function as the "trial consumed" marker that
 * prevents starting a second local trial.
 */
export function deriveTier(user, sub, nowMs) {
  if (user?.billingTier === BILLING_TIERS.PRO_LEGACY) {
    return BILLING_TIERS.PRO_LEGACY;
  }
  if (sub) {
    const { status, currentPeriodEnd } = sub;

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

  if (
    typeof user?.trialUsedAt === "number" &&
    nowMs < user.trialUsedAt + LOCAL_TRIAL_MS
  ) {
    return BILLING_TIERS.PRO;
  }

  return BILLING_TIERS.FREE;
}

/**
 * Compute local trial state from the user record alone (no sub).
 * Used by entitlement reads to surface countdown info to the UI.
 */
export function localTrialState(user, nowMs) {
  if (typeof user?.trialUsedAt !== "number") {
    return { active: false, endsAt: null, daysLeft: 0 };
  }
  const endsAt = user.trialUsedAt + LOCAL_TRIAL_MS;
  if (endsAt <= nowMs) {
    return { active: false, endsAt, daysLeft: 0 };
  }
  return {
    active: true,
    endsAt,
    daysLeft: Math.ceil((endsAt - nowMs) / DAY_MS),
  };
}
