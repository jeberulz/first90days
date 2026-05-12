import { convexTest } from "convex-test";
import { expect, describe, it } from "vitest";
import schema from "./schema.js";
import { api, internal } from "./_generated/api";
import { LOCAL_TRIAL_MS } from "./lib/billing.js";

const DAY = 24 * 60 * 60 * 1000;

const SUB_ID = "sub_test_123";
const CUSTOMER_ID = "cus_test_123";
const PRICE_ID = "price_test_monthly";

function buildSubscription(overrides = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    id: SUB_ID,
    customer: CUSTOMER_ID,
    status: "trialing",
    current_period_end: nowSec + 30 * 86400,
    trial_end: nowSec + 14 * 86400,
    cancel_at_period_end: false,
    updated: nowSec,
    items: { data: [{ price: { id: PRICE_ID } }] },
    metadata: {},
    ...overrides,
  };
}

describe("processStripeEvent", () => {
  it("is idempotent: duplicate event.id is a no-op", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "dup@example.com" })
    );
    const sub = buildSubscription({ metadata: { convexUserId: userId } });

    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_dup_1",
      eventType: "customer.subscription.created",
      payload: sub,
    });

    // Second call with same eventId but different status payload
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_dup_1",
      eventType: "customer.subscription.created",
      payload: { ...sub, status: "active" },
    });

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_stripe_subscription", (q) =>
          q.eq("stripeSubscriptionId", SUB_ID)
        )
        .unique()
    );
    expect(row.status).toBe("trialing");
  });

  it("inserts subscription row and caches billingTier=pro on trialing", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "new@example.com" })
    );
    const sub = buildSubscription({ metadata: { convexUserId: userId } });

    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_create",
      eventType: "customer.subscription.created",
      payload: sub,
    });

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(row).not.toBeNull();
    expect(row.status).toBe("trialing");
    expect(row.priceId).toBe(PRICE_ID);
    expect(row.cancelAtPeriodEnd).toBe(false);
    expect(row.trialEnd).toBeGreaterThan(Date.now());

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.billingTier).toBe("pro");
  });

  it("rejects out-of-order updates (older stripeUpdatedAt)", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "order@example.com" })
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const newer = buildSubscription({
      metadata: { convexUserId: userId },
      status: "active",
      updated: nowSec,
    });
    const older = buildSubscription({
      metadata: { convexUserId: userId },
      status: "past_due",
      updated: nowSec - 60,
    });

    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_newer",
      eventType: "customer.subscription.updated",
      payload: newer,
    });
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_older",
      eventType: "customer.subscription.updated",
      payload: older,
    });

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_stripe_subscription", (q) =>
          q.eq("stripeSubscriptionId", SUB_ID)
        )
        .unique()
    );
    expect(row.status).toBe("active");
  });

  it("handles missing convexUserId metadata without throwing", async () => {
    const t = convexTest(schema);
    const sub = buildSubscription({ metadata: {} });

    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_no_meta",
      eventType: "customer.subscription.created",
      payload: sub,
    });

    // Idempotency row still written so Stripe doesn't retry forever
    const log = await t.run(async (ctx) =>
      ctx.db
        .query("billingWebhookLog")
        .withIndex("by_event", (q) => q.eq("eventId", "evt_no_meta"))
        .unique()
    );
    expect(log).not.toBeNull();

    // No subscription row should have been inserted
    const row = await t.run(async (ctx) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_stripe_subscription", (q) =>
          q.eq("stripeSubscriptionId", SUB_ID)
        )
        .unique()
    );
    expect(row).toBeNull();
  });

  it("does not overwrite pro_legacy tier on the user record", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "legacy@example.com",
        billingTier: "pro_legacy",
        grandfatheredAt: Date.now(),
      })
    );
    const sub = buildSubscription({
      metadata: { convexUserId: userId },
      status: "canceled",
      current_period_end: Math.floor(Date.now() / 1000) - 10,
    });

    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_legacy",
      eventType: "customer.subscription.updated",
      payload: sub,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.billingTier).toBe("pro_legacy");
  });

  it("invoice.payment_failed sets paymentFailedAt on the subscription row", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "fail@example.com" })
    );
    const sub = buildSubscription({
      metadata: { convexUserId: userId },
      status: "past_due",
    });
    // First create the subscription via a subscription event
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_sub_create",
      eventType: "customer.subscription.created",
      payload: sub,
    });

    const before = await t.run(async (ctx) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(before.paymentFailedAt).toBeUndefined();

    // Now fire the payment_failed event
    const invoicePayload = { customer: CUSTOMER_ID, id: "in_test_1" };
    const beforeTs = Date.now();
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_invoice_fail",
      eventType: "invoice.payment_failed",
      payload: invoicePayload,
    });

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(row.paymentFailedAt).toBeGreaterThanOrEqual(beforeTs);
  });

  it("invoice.payment_failed is idempotent: duplicate event is a no-op", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "faildup@example.com" })
    );
    const sub = buildSubscription({ metadata: { convexUserId: userId } });
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_sub_for_dup",
      eventType: "customer.subscription.created",
      payload: sub,
    });

    const invoicePayload = { customer: CUSTOMER_ID, id: "in_dup_1" };
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_fail_dup",
      eventType: "invoice.payment_failed",
      payload: invoicePayload,
    });
    const firstTs = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("billingSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      return row.paymentFailedAt;
    });

    // Same eventId — should be skipped
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_fail_dup",
      eventType: "invoice.payment_failed",
      payload: invoicePayload,
    });
    const secondTs = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("billingSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      return row.paymentFailedAt;
    });
    expect(secondTs).toBe(firstTs);
  });

  it("subscription recovery to active clears paymentFailedAt", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "recover@example.com" })
    );
    const nowSec = Math.floor(Date.now() / 1000);
    const sub = buildSubscription({
      metadata: { convexUserId: userId },
      status: "past_due",
      updated: nowSec - 10,
    });
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_sub_pastdue",
      eventType: "customer.subscription.created",
      payload: sub,
    });

    // Simulate payment_failed setting the timestamp
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_fail_recover",
      eventType: "invoice.payment_failed",
      payload: { customer: CUSTOMER_ID, id: "in_recover_1" },
    });
    const afterFail = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("billingSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      return row.paymentFailedAt;
    });
    expect(typeof afterFail).toBe("number");

    // Subscription recovers to active
    const recovered = buildSubscription({
      metadata: { convexUserId: userId },
      status: "active",
      updated: nowSec,
    });
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_sub_recovered",
      eventType: "customer.subscription.updated",
      payload: recovered,
    });

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("billingSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()
    );
    expect(row.paymentFailedAt).toBeUndefined();
  });

  it("checkout.session.completed sets trialUsedAt and stripeCustomerId", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "checkout@example.com" })
    );

    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_checkout",
      eventType: "checkout.session.completed",
      payload: {
        id: "cs_test_1",
        customer: CUSTOMER_ID,
        metadata: { convexUserId: userId },
      },
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(typeof user.trialUsedAt).toBe("number");
    expect(user.stripeCustomerId).toBe(CUSTOMER_ID);
  });
});

describe("getEntitlementsInternal", () => {
  it("returns free tier for a new user with no subscription", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "noobie@example.com" })
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.tier).toBe("free");
    expect(ent.isPro).toBe(false);
    expect(ent.dailyEnrichCap).toBe(5);
    expect(ent.trialDaysLeft).toBe(0);
    expect(ent.status).toBeNull();
  });

  it("returns pro + trialDaysLeft for a trialing subscription", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "trial@example.com" })
    );
    const sub = buildSubscription({ metadata: { convexUserId: userId } });
    await t.mutation(internal.billing.processStripeEvent, {
      eventId: "evt_ent_trial",
      eventType: "customer.subscription.created",
      payload: sub,
    });

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.tier).toBe("pro");
    expect(ent.isPro).toBe(true);
    expect(ent.dailyEnrichCap).toBe(100);
    expect(ent.trialDaysLeft).toBeGreaterThan(0);
    expect(ent.trialDaysLeft).toBeLessThanOrEqual(14);
    expect(ent.status).toBe("trialing");
  });

  it("returns pro_legacy for a grandfathered user with no subscription", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "pilot@example.com",
        billingTier: "pro_legacy",
        grandfatheredAt: Date.now(),
      })
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.tier).toBe("pro_legacy");
    expect(ent.isPro).toBe(true);
    expect(ent.dailyEnrichCap).toBe(100);
    expect(ent.status).toBeNull();
  });

  it("reads usedToday from settings.kb.enrichmentBudgetUsedToday", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "used@example.com",
        settings: {
          kb: {
            enrichmentBudgetUsedToday: 3,
            enrichmentBudgetResetDate: "2026-04-13",
          },
        },
      })
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.usedToday).toBe(3);
  });
});

describe("startLocalTrial", () => {
  it("starts a 7-day trial for a fresh user and sets trialUsedAt", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "trial-fresh@example.com" })
    );

    const before = Date.now();
    const result = await t.withIdentity({ subject: userId }).mutation(
      api.billing.startLocalTrial,
      {}
    );

    expect(result.started).toBe(true);
    expect(result.trialEndsAt).toBeGreaterThan(before + LOCAL_TRIAL_MS - 1000);
    expect(result.trialEndsAt).toBeLessThan(Date.now() + LOCAL_TRIAL_MS + 1000);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(typeof user.trialUsedAt).toBe("number");
  });

  it("derives PRO entitlement immediately after starting trial", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "trial-ent@example.com" })
    );

    await t.withIdentity({ subject: userId }).mutation(
      api.billing.startLocalTrial,
      {}
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.tier).toBe("pro");
    expect(ent.isPro).toBe(true);
    expect(ent.localTrialActive).toBe(true);
    expect(ent.localTrialEndsAt).toBeGreaterThan(Date.now());
    expect(ent.trialDaysLeft).toBe(7);
    expect(ent.dailyEnrichCap).toBe(100);
  });

  it("is idempotent: second call no-ops with already_active reason", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "trial-idem@example.com" })
    );

    const first = await t.withIdentity({ subject: userId }).mutation(
      api.billing.startLocalTrial,
      {}
    );
    const second = await t.withIdentity({ subject: userId }).mutation(
      api.billing.startLocalTrial,
      {}
    );

    expect(first.started).toBe(true);
    expect(second.started).toBe(false);
    expect(second.reason).toBe("already_active");
    expect(second.trialEndsAt).toBe(first.trialEndsAt);
  });

  it("refuses when trial has already been used and elapsed", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "trial-spent@example.com",
        trialUsedAt: Date.now() - 30 * DAY,
      })
    );

    const result = await t.withIdentity({ subject: userId }).mutation(
      api.billing.startLocalTrial,
      {}
    );

    expect(result.started).toBe(false);
    expect(result.reason).toBe("already_used");

    // The user record was not modified — trialUsedAt is unchanged.
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.trialUsedAt).toBeLessThan(Date.now() - 29 * DAY);
  });

  it("refuses when a Stripe subscription already exists", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "trial-subbed@example.com" })
    );
    // Create a subscription row directly (skip the Stripe path).
    await t.run(async (ctx) =>
      ctx.db.insert("billingSubscriptions", {
        userId,
        stripeCustomerId: "cus_existing",
        stripeSubscriptionId: "sub_existing",
        priceId: "price_test",
        status: "active",
        currentPeriodEnd: Date.now() + 30 * DAY,
        cancelAtPeriodEnd: false,
        stripeUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const result = await t.withIdentity({ subject: userId }).mutation(
      api.billing.startLocalTrial,
      {}
    );

    expect(result.started).toBe(false);
    expect(result.reason).toBe("subscription_exists");

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.trialUsedAt).toBeUndefined();
  });

  it("returns pro_legacy reason for grandfathered users without modifying record", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "legacy-trial@example.com",
        billingTier: "pro_legacy",
      })
    );

    const result = await t.withIdentity({ subject: userId }).mutation(
      api.billing.startLocalTrial,
      {}
    );

    expect(result.started).toBe(false);
    expect(result.reason).toBe("pro_legacy");
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.trialUsedAt).toBeUndefined();
  });
});

describe("computeEntitlements local trial", () => {
  it("expired local trial: localTrialUsed=true, localTrialActive=false, tier=free", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "expired@example.com",
        trialUsedAt: Date.now() - 30 * DAY,
      })
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.tier).toBe("free");
    expect(ent.localTrialActive).toBe(false);
    expect(ent.localTrialUsed).toBe(true);
    expect(ent.trialDaysLeft).toBe(0);
  });

  it("once a sub exists, local-trial fields are no longer populated", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "post-trial@example.com",
        trialUsedAt: Date.now() - 30 * DAY,
      })
    );
    await t.run(async (ctx) =>
      ctx.db.insert("billingSubscriptions", {
        userId,
        stripeCustomerId: "cus_x",
        stripeSubscriptionId: "sub_x",
        priceId: "price_x",
        status: "active",
        currentPeriodEnd: Date.now() + 30 * DAY,
        cancelAtPeriodEnd: false,
        stripeUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.tier).toBe("pro");
    expect(ent.localTrialActive).toBe(false);
    expect(ent.localTrialEndsAt).toBeNull();
  });
});

describe("getTierInternal", () => {
  it("returns free for a user with no subscription", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "bare@example.com" })
    );
    const result = await t.query(internal.billing.getTierInternal, { userId });
    expect(result.tier).toBe("free");
  });

  it("returns pro_legacy regardless of subscription state", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "legacy2@example.com",
        billingTier: "pro_legacy",
      })
    );
    const result = await t.query(internal.billing.getTierInternal, { userId });
    expect(result.tier).toBe("pro_legacy");
  });
});

describe("enrichment budget mutations", () => {
  it("resetEnrichmentBudget zeroes the counter and stamps date", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "reset@example.com",
        settings: {
          timezone: "Europe/London",
          kb: {
            enrichmentBudgetUsedToday: 99,
            enrichmentBudgetResetDate: "2026-04-12",
          },
        },
      })
    );

    await t.mutation(internal.kbInternal.resetEnrichmentBudget, {
      userId,
      date: "2026-04-13",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.settings.kb.enrichmentBudgetUsedToday).toBe(0);
    expect(user.settings.kb.enrichmentBudgetResetDate).toBe("2026-04-13");
    // Unrelated settings preserved
    expect(user.settings.timezone).toBe("Europe/London");
  });

  it("resetEnrichmentBudget preserves other kb settings fields", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "preserve@example.com",
        settings: {
          kb: {
            enrichmentEnabled: true,
            autoIngestReflections: true,
            enrichmentBudgetUsedToday: 5,
            enrichmentBudgetResetDate: "2026-04-12",
          },
        },
      })
    );

    await t.mutation(internal.kbInternal.resetEnrichmentBudget, {
      userId,
      date: "2026-04-13",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.settings.kb.enrichmentEnabled).toBe(true);
    expect(user.settings.kb.autoIngestReflections).toBe(true);
    expect(user.settings.kb.enrichmentBudgetUsedToday).toBe(0);
  });

  it("incrementEnrichmentBudget bumps counter by 1 from undefined", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "inc@example.com" })
    );

    await t.mutation(internal.kbInternal.incrementEnrichmentBudget, {
      userId,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.settings.kb.enrichmentBudgetUsedToday).toBe(1);
  });

  it("incrementEnrichmentBudget bumps counter by 1 from existing value", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "inc2@example.com",
        settings: {
          kb: {
            enrichmentBudgetUsedToday: 3,
            enrichmentBudgetResetDate: "2026-04-13",
          },
        },
      })
    );

    await t.mutation(internal.kbInternal.incrementEnrichmentBudget, {
      userId,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.settings.kb.enrichmentBudgetUsedToday).toBe(4);
    expect(user.settings.kb.enrichmentBudgetResetDate).toBe("2026-04-13");
  });

  it("two sequential increments end at +2", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "seq@example.com" })
    );

    await t.mutation(internal.kbInternal.incrementEnrichmentBudget, {
      userId,
    });
    await t.mutation(internal.kbInternal.incrementEnrichmentBudget, {
      userId,
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user.settings.kb.enrichmentBudgetUsedToday).toBe(2);
  });
});

// ---------- Whisperer surfacing in entitlements (U1) ----------
// These tests pass an explicit `modules` map so convex-test loads the
// worktree's billing.js (the default auto-discover glob resolves relative
// to the convex-test package location, which lands on the main repo).

const whispererModules = import.meta.glob("./**/*.{js,ts}");

describe("computeEntitlements whisperer surfacing", () => {
  it("free user with no usage: full 200¢ ceiling, ~13 whisperer calls remaining", async () => {
    const t = convexTest(schema, whispererModules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "wh-free@example.com" })
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.aiUsageCeilingCents).toBe(200);
    expect(ent.aiUsageUsedCents).toBe(0);
    expect(ent.whispererCallsRemainingEst).toBe(13);
  });

  it("pro user with 150¢ spent: surfaces 1350¢ remaining, 90 calls remaining", async () => {
    const t = convexTest(schema, whispererModules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "wh-pro@example.com",
        billingTier: "pro",
      })
    );
    // Pro tier requires an active sub OR pro_legacy. Wire up an active sub
    // so deriveTier returns "pro" and the 1500¢ ceiling applies.
    await t.run(async (ctx) =>
      ctx.db.insert("billingSubscriptions", {
        userId,
        stripeCustomerId: "cus_pro",
        stripeSubscriptionId: "sub_pro",
        priceId: "price_pro",
        status: "active",
        currentPeriodEnd: Date.now() + 30 * DAY,
        cancelAtPeriodEnd: false,
        stripeUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // Day-key-agnostic: write under utcDayKey to match the legacy read path.
    const utcKey = (() => {
      const d = new Date();
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    })();
    await t.run(async (ctx) =>
      ctx.db.insert("aiUsage", {
        userId,
        dayKey: utcKey,
        costCents: 150,
        requestCount: 3,
        lastRequestAt: Date.now(),
      })
    );

    const ent = await t.query(internal.billing.getEntitlementsInternal, {
      userId,
    });
    expect(ent.tier).toBe("pro");
    expect(ent.aiUsageCeilingCents).toBe(1500);
    expect(ent.aiUsageUsedCents).toBe(150);
    expect(ent.whispererCallsRemainingEst).toBe(90);
  });
});
