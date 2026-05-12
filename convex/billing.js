import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import {
  BILLING_TIERS,
  LOCAL_TRIAL_MS,
  deriveTier,
  capForTier,
  localTrialState,
} from "./lib/billing.js";
import {
  OP_COSTS,
  tierCeilingCents,
  getDailySpendCents,
} from "./lib/rateLimit.js";

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

  // Stripe-driven trial (only meaningful while a sub exists).
  const stripeTrialEndsAt = sub?.trialEnd ?? null;
  const stripeTrialDaysLeft =
    stripeTrialEndsAt && stripeTrialEndsAt > now
      ? Math.ceil((stripeTrialEndsAt - now) / DAY_MS)
      : 0;

  // Local (no-card) trial — only relevant when there is no Stripe sub yet.
  const local = sub ? null : localTrialState(user, now);

  // For UI continuity, surface the active source as `trialEndsAt` /
  // `trialDaysLeft`. Pre-sub: local trial. Post-sub: Stripe trial. Both
  // become 0 / null once the trial is over.
  const trialEndsAt = local?.active ? local.endsAt : stripeTrialEndsAt;
  const trialDaysLeft = local?.active ? local.daysLeft : stripeTrialDaysLeft;

  // Whisperer surfacing (U1): expose the cents ceiling + an estimate of
  // remaining whisperer calls (full shared ledger / OP_COSTS.whisperer).
  // UI uses this in the cap-aware affordance to show "X whisperer help
  // left today" copy when the user gets close to the ceiling.
  const aiUsageCeilingCents = tierCeilingCents(tier);
  const aiUsageUsedCents = await getDailySpendCents(ctx, userId);
  const remainingCents = Math.max(0, aiUsageCeilingCents - aiUsageUsedCents);
  const whispererCallsRemainingEst = Math.floor(
    remainingCents / OP_COSTS.whisperer
  );

  return {
    tier,
    isPro: tier !== BILLING_TIERS.FREE,
    status: sub?.status ?? null,
    trialEndsAt,
    trialDaysLeft,
    // Distinct fields so the UI can tell the two trial sources apart.
    localTrialActive: local?.active ?? false,
    localTrialEndsAt: local?.endsAt ?? null,
    localTrialUsed:
      typeof user.trialUsedAt === "number" && local && !local.active,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    dailyEnrichCap: capForTier(tier),
    usedToday: user.settings?.kb?.enrichmentBudgetUsedToday ?? 0,
    paymentFailedAt: sub?.paymentFailedAt ?? null,
    // Whisperer (U1)
    aiUsageCeilingCents,
    aiUsageUsedCents,
    whispererCallsRemainingEst,
  };
}

/**
 * Start a local (no-card) trial for the authenticated user.
 * Idempotent: if the user has already used a trial OR has an existing Stripe
 * subscription, returns the existing state without modifying anything.
 * Returns the trial end timestamp so the UI can confirm.
 */
export const startLocalTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("user not found");

    if (user.billingTier === BILLING_TIERS.PRO_LEGACY) {
      // Grandfathered users don't need a trial.
      return { started: false, reason: "pro_legacy", trialEndsAt: null };
    }

    if (typeof user.trialUsedAt === "number") {
      const endsAt = user.trialUsedAt + LOCAL_TRIAL_MS;
      const active = endsAt > Date.now();
      return {
        started: false,
        reason: active ? "already_active" : "already_used",
        trialEndsAt: endsAt,
      };
    }

    const sub = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (sub) {
      return {
        started: false,
        reason: "subscription_exists",
        trialEndsAt: null,
      };
    }

    const now = Date.now();
    await ctx.db.patch(userId, { trialUsedAt: now });
    return { started: true, trialEndsAt: now + LOCAL_TRIAL_MS };
  },
});

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
