import { describe, it, expect } from "vitest";
import {
  deriveTier,
  capForTier,
  isProTier,
  computeQuotaState,
  BILLING_TIERS,
  FREE_DAILY_ENRICHMENT_CAP,
  PRO_DAILY_ENRICHMENT_CAP,
  GRACE_PERIOD_MS,
} from "./billing.js";

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const userFree = { billingTier: "free" };
const userLegacy = { billingTier: "pro_legacy" };
const userNoTier = {};

function sub(overrides = {}) {
  return {
    status: "active",
    currentPeriodEnd: NOW + 30 * DAY,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe("deriveTier", () => {
  it("free user with no subscription → free", () => {
    expect(deriveTier(userFree, null, NOW)).toBe(BILLING_TIERS.FREE);
  });

  it("trialing subscription → pro", () => {
    expect(deriveTier(userFree, sub({ status: "trialing" }), NOW)).toBe(
      BILLING_TIERS.PRO
    );
  });

  it("active subscription → pro", () => {
    expect(deriveTier(userFree, sub({ status: "active" }), NOW)).toBe(
      BILLING_TIERS.PRO
    );
  });

  it("canceled but period still in future → pro", () => {
    expect(
      deriveTier(
        userFree,
        sub({ status: "canceled", currentPeriodEnd: NOW + DAY }),
        NOW
      )
    ).toBe(BILLING_TIERS.PRO);
  });

  it("canceled and period lapsed → free", () => {
    expect(
      deriveTier(
        userFree,
        sub({ status: "canceled", currentPeriodEnd: NOW - DAY }),
        NOW
      )
    ).toBe(BILLING_TIERS.FREE);
  });

  it("past_due within grace period → pro", () => {
    expect(
      deriveTier(
        userFree,
        sub({
          status: "past_due",
          currentPeriodEnd: NOW - GRACE_PERIOD_MS / 2,
        }),
        NOW
      )
    ).toBe(BILLING_TIERS.PRO);
  });

  it("past_due beyond grace period → free", () => {
    expect(
      deriveTier(
        userFree,
        sub({
          status: "past_due",
          currentPeriodEnd: NOW - GRACE_PERIOD_MS - DAY,
        }),
        NOW
      )
    ).toBe(BILLING_TIERS.FREE);
  });

  it("incomplete_expired → free", () => {
    expect(
      deriveTier(userFree, sub({ status: "incomplete_expired" }), NOW)
    ).toBe(BILLING_TIERS.FREE);
  });

  it("pro_legacy user → pro_legacy even with no subscription", () => {
    expect(deriveTier(userLegacy, null, NOW)).toBe(BILLING_TIERS.PRO_LEGACY);
  });

  it("pro_legacy user → pro_legacy even with canceled subscription", () => {
    expect(
      deriveTier(
        userLegacy,
        sub({ status: "canceled", currentPeriodEnd: NOW - DAY }),
        NOW
      )
    ).toBe(BILLING_TIERS.PRO_LEGACY);
  });

  it("user with no tier field and no sub → free", () => {
    expect(deriveTier(userNoTier, null, NOW)).toBe(BILLING_TIERS.FREE);
  });
});

describe("capForTier", () => {
  it("free tier uses free cap", () => {
    expect(capForTier(BILLING_TIERS.FREE)).toBe(FREE_DAILY_ENRICHMENT_CAP);
  });

  it("pro tier uses pro cap", () => {
    expect(capForTier(BILLING_TIERS.PRO)).toBe(PRO_DAILY_ENRICHMENT_CAP);
  });

  it("pro_legacy tier uses pro cap", () => {
    expect(capForTier(BILLING_TIERS.PRO_LEGACY)).toBe(
      PRO_DAILY_ENRICHMENT_CAP
    );
  });

  it("unknown tier falls back to free cap", () => {
    expect(capForTier("bogus")).toBe(FREE_DAILY_ENRICHMENT_CAP);
  });
});

describe("isProTier", () => {
  it("pro is pro", () => {
    expect(isProTier(BILLING_TIERS.PRO)).toBe(true);
  });

  it("pro_legacy is pro", () => {
    expect(isProTier(BILLING_TIERS.PRO_LEGACY)).toBe(true);
  });

  it("free is not pro", () => {
    expect(isProTier(BILLING_TIERS.FREE)).toBe(false);
  });
});

describe("computeQuotaState", () => {
  const TODAY = "2026-04-13";
  const YESTERDAY = "2026-04-12";

  it("free user with no prior usage → not over cap, reset needed", () => {
    const q = computeQuotaState({
      tier: BILLING_TIERS.FREE,
      kbSettings: undefined,
      todayYmd: TODAY,
    });
    expect(q.cap).toBe(FREE_DAILY_ENRICHMENT_CAP);
    expect(q.usedToday).toBe(0);
    expect(q.resetNeeded).toBe(true);
    expect(q.overCap).toBe(false);
  });

  it("free user under cap on today's date → not over cap, no reset", () => {
    const q = computeQuotaState({
      tier: BILLING_TIERS.FREE,
      kbSettings: {
        enrichmentBudgetUsedToday: 2,
        enrichmentBudgetResetDate: TODAY,
      },
      todayYmd: TODAY,
    });
    expect(q.usedToday).toBe(2);
    expect(q.resetNeeded).toBe(false);
    expect(q.overCap).toBe(false);
  });

  it("free user at exact cap → over cap", () => {
    const q = computeQuotaState({
      tier: BILLING_TIERS.FREE,
      kbSettings: {
        enrichmentBudgetUsedToday: FREE_DAILY_ENRICHMENT_CAP,
        enrichmentBudgetResetDate: TODAY,
      },
      todayYmd: TODAY,
    });
    expect(q.overCap).toBe(true);
  });

  it("free user whose counter is stale from yesterday → effective used is 0, reset needed, not over", () => {
    const q = computeQuotaState({
      tier: BILLING_TIERS.FREE,
      kbSettings: {
        enrichmentBudgetUsedToday: 99, // stale — from yesterday
        enrichmentBudgetResetDate: YESTERDAY,
      },
      todayYmd: TODAY,
    });
    expect(q.usedToday).toBe(0);
    expect(q.resetNeeded).toBe(true);
    expect(q.overCap).toBe(false);
  });

  it("pro user at free-tier cap → not over (pro cap is higher)", () => {
    const q = computeQuotaState({
      tier: BILLING_TIERS.PRO,
      kbSettings: {
        enrichmentBudgetUsedToday: FREE_DAILY_ENRICHMENT_CAP,
        enrichmentBudgetResetDate: TODAY,
      },
      todayYmd: TODAY,
    });
    expect(q.cap).toBe(PRO_DAILY_ENRICHMENT_CAP);
    expect(q.overCap).toBe(false);
  });

  it("pro_legacy user gets the pro cap", () => {
    const q = computeQuotaState({
      tier: BILLING_TIERS.PRO_LEGACY,
      kbSettings: {
        enrichmentBudgetUsedToday: 50,
        enrichmentBudgetResetDate: TODAY,
      },
      todayYmd: TODAY,
    });
    expect(q.cap).toBe(PRO_DAILY_ENRICHMENT_CAP);
    expect(q.overCap).toBe(false);
  });

  it("pro user at pro cap → over cap", () => {
    const q = computeQuotaState({
      tier: BILLING_TIERS.PRO,
      kbSettings: {
        enrichmentBudgetUsedToday: PRO_DAILY_ENRICHMENT_CAP,
        enrichmentBudgetResetDate: TODAY,
      },
      todayYmd: TODAY,
    });
    expect(q.overCap).toBe(true);
  });
});
