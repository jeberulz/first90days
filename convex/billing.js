import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import {
  BILLING_TIERS,
  deriveTier,
  capForTier,
} from "./lib/billing.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Shared entitlement read. Fetches user + subscription and derives tier.
 * Called by both the public getEntitlements query and the viewer extension,
 * so both paths return identical state without re-implementing the logic.
 * Returns null when the user does not exist.
 */
export async function computeEntitlements(ctx, userId) {
  const user = await ctx.db.get(userId);
  if (!user) return null;

  const sub = await ctx.db
    .query("billingSubscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  const now = Date.now();
  const tier = deriveTier(user, sub, now);
  const trialEndsAt = sub?.trialEnd ?? null;
  const trialDaysLeft =
    trialEndsAt && trialEndsAt > now
      ? Math.ceil((trialEndsAt - now) / DAY_MS)
      : 0;

  return {
    tier,
    isPro: tier !== BILLING_TIERS.FREE,
    status: sub?.status ?? null,
    trialEndsAt,
    trialDaysLeft,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    dailyEnrichCap: capForTier(tier),
    usedToday: user.settings?.kb?.enrichmentBudgetUsedToday ?? 0,
    paymentFailedAt: sub?.paymentFailedAt ?? null,
  };
}

/**
 * Idempotent Stripe event processor. Called from the webhook httpAction after
 * signature verification. Every call first checks billingWebhookLog by eventId
 * to short-circuit duplicate deliveries — Stripe retries for up to 3 days, so
 * this MUST be idempotent.
 */
export const processStripeEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, { eventId, eventType, payload }) => {
    const existing = await ctx.db
      .query("billingWebhookLog")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .unique();
    if (existing) return { skipped: "duplicate" };

    try {
      if (eventType === "checkout.session.completed") {
        await handleCheckoutCompleted(ctx, payload);
      } else if (
        eventType === "customer.subscription.created" ||
        eventType === "customer.subscription.updated" ||
        eventType === "customer.subscription.deleted"
      ) {
        await handleSubscriptionEvent(ctx, payload, eventType);
      } else if (eventType === "invoice.payment_failed") {
        await handlePaymentFailed(ctx, payload);
      }
      // invoice.paid: logged for idempotency only.
      // subscription.updated carries the authoritative status change.

      await ctx.db.insert("billingWebhookLog", {
        eventId,
        eventType,
        processedAt: Date.now(),
      });
      return { ok: true };
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.error(`[processStripeEvent] ${eventId} (${eventType}): ${msg}`);
      // Record the failure so we can replay manually; still throw so Stripe retries.
      await ctx.db.insert("billingWebhookLog", {
        eventId,
        eventType,
        processedAt: Date.now(),
        error: msg,
      });
      throw err;
    }
  },
});

async function handleCheckoutCompleted(ctx, session) {
  const convexUserId = session?.metadata?.convexUserId;
  if (!convexUserId) {
    console.warn(
      `[checkout.session.completed] missing metadata.convexUserId on ${session?.id}`
    );
    return;
  }
  const user = await ctx.db.get(convexUserId);
  if (!user) {
    console.warn(
      `[checkout.session.completed] unknown user ${convexUserId}`
    );
    return;
  }

  const patch = {};
  if (!user.trialUsedAt) patch.trialUsedAt = Date.now();
  if (!user.stripeCustomerId && typeof session.customer === "string") {
    patch.stripeCustomerId = session.customer;
  }
  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id, patch);
  }
}

async function handleSubscriptionEvent(ctx, sub, eventType) {
  const convexUserId = sub?.metadata?.convexUserId;
  if (!convexUserId) {
    console.warn(
      `[${eventType}] subscription ${sub?.id} missing metadata.convexUserId`
    );
    return;
  }

  const user = await ctx.db.get(convexUserId);
  if (!user) {
    console.warn(
      `[${eventType}] unknown user ${convexUserId} for subscription ${sub?.id}`
    );
    return;
  }

  // Out-of-order guard. Stripe does not guarantee delivery order; an older
  // event arriving after a newer one must not rewind state.
  const stripeUpdatedAt =
    Number.isFinite(sub.updated) && sub.updated > 0
      ? sub.updated * 1000
      : Date.now();

  const existing = await ctx.db
    .query("billingSubscriptions")
    .withIndex("by_stripe_subscription", (q) =>
      q.eq("stripeSubscriptionId", sub.id)
    )
    .unique();

  if (existing && existing.stripeUpdatedAt >= stripeUpdatedAt) {
    return;
  }

  const currentPeriodEnd = Number.isFinite(sub.current_period_end)
    ? sub.current_period_end * 1000
    : 0;

  const record = {
    userId: convexUserId,
    stripeCustomerId: String(sub.customer ?? ""),
    stripeSubscriptionId: sub.id,
    priceId: sub.items?.data?.[0]?.price?.id ?? "",
    status: sub.status,
    currentPeriodEnd,
    trialEnd: sub.trial_end ? sub.trial_end * 1000 : undefined,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    stripeUpdatedAt,
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, record);
  } else {
    await ctx.db.insert("billingSubscriptions", record);
  }

  // Hot-cache billingTier on users. pro_legacy is never overwritten.
  if (user.billingTier !== BILLING_TIERS.PRO_LEGACY) {
    const now = Date.now();
    const cached =
      sub.status === "trialing" || sub.status === "active"
        ? BILLING_TIERS.PRO
        : sub.status === "canceled" && currentPeriodEnd > now
          ? BILLING_TIERS.PRO
          : BILLING_TIERS.FREE;
    if (user.billingTier !== cached) {
      await ctx.db.patch(user._id, { billingTier: cached });
    }
  }

  // Clear paymentFailedAt when subscription recovers to a healthy state.
  if (
    (sub.status === "active" || sub.status === "trialing") &&
    existing?.paymentFailedAt !== undefined
  ) {
    await ctx.db.patch(existing._id, { paymentFailedAt: undefined });
  }
}

/**
 * Handle invoice.payment_failed: record the failure timestamp on the
 * subscription row so the in-app UI can surface a payment failure banner,
 * and schedule an email notification to the user.
 *
 * The subscription status transition to past_due is delivered separately via
 * customer.subscription.updated; this event adds the precise failure timestamp
 * and triggers dunning outreach.
 */
async function handlePaymentFailed(ctx, invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customerId) {
    console.warn("[invoice.payment_failed] missing customer field on invoice");
    return;
  }

  const sub = await ctx.db
    .query("billingSubscriptions")
    .withIndex("by_stripe_customer", (q) =>
      q.eq("stripeCustomerId", customerId)
    )
    .first();

  if (!sub) {
    console.warn(
      `[invoice.payment_failed] no subscription found for customer ${customerId}`
    );
    return;
  }

  await ctx.db.patch(sub._id, { paymentFailedAt: Date.now() });

  // Schedule out-of-transaction email notification — fire and forget.
  await ctx.scheduler.runAfter(
    0,
    internal.billingActions.sendPaymentFailedNotification,
    { userId: sub.userId }
  );
}

/**
 * Public entitlement query for the current session. Returns null when the
 * caller is not authenticated. The settings and KB pages call this directly;
 * most other pages read the slimmer tier fields off `viewer` instead.
 */
export const getEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await computeEntitlements(ctx, userId);
  },
});

/**
 * Internal sibling of getEntitlements — takes userId explicitly so it can be
 * called from tests and from internal actions without an auth context.
 */
export const getEntitlementsInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await computeEntitlements(ctx, userId);
  },
});

/**
 * Minimal tier lookup used by the enrichment gate in kbPipeline.runEnrich.
 * Stripped down so the hot path stays cheap: one user read + one sub read.
 */
export const getTierInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { tier: BILLING_TIERS.FREE };
    const sub = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return { tier: deriveTier(user, sub, Date.now()) };
  },
});

// ---------- Helpers used by the Node-side billingActions ----------

export const getUserForBillingInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const getSubscriptionInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const saveStripeCustomerId = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { userId, stripeCustomerId }) => {
    await ctx.db.patch(userId, { stripeCustomerId });
  },
});
