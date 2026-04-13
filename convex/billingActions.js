"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

/**
 * Lazily create (or return) a Stripe customer for the authenticated user.
 * Idempotent: if users.stripeCustomerId is already set, returns it without
 * hitting the Stripe API. The webhook handler can also self-heal via
 * subscription.metadata.convexUserId if this action is ever raced.
 */
export const ensureStripeCustomer = action({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("unauthorized");

    const user = await ctx.runQuery(
      internal.billing.getUserForBillingInternal,
      { userId }
    );
    if (!user) throw new Error("user not found");
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(secret);
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { convexUserId: String(userId) },
    });

    await ctx.runMutation(internal.billing.saveStripeCustomerId, {
      userId,
      stripeCustomerId: customer.id,
    });

    return customer.id;
  },
});

/**
 * Cancel the user's Stripe subscription (if any) and then schedule the
 * purgeUserData pass. This is the only entry point users.deleteAccount uses
 * for user removal — the mutation no longer schedules purgeUserData directly.
 *
 * Iron rule: purgeUserData is scheduled ONLY on success, or when there is
 * genuinely nothing to cancel. If Stripe returns an unexpected error, we
 * throw: the user's data stays intact and support can investigate. This
 * prevents the worst-case scenario where we delete the Convex row but keep
 * billing the customer.
 *
 * `resource_missing` is tolerated because Stripe has already lost the
 * subscription (manual dashboard cancel, prior run of this action, etc.) —
 * there's nothing to revoke.
 */
export const cancelSubscriptionForUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const sub = await ctx.runQuery(
      internal.billing.getSubscriptionInternal,
      { userId }
    );

    if (sub?.stripeSubscriptionId) {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) {
        throw new Error("STRIPE_SECRET_KEY not configured");
      }
      const stripe = new Stripe(secret);
      try {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId, {
          prorate: false,
        });
      } catch (err) {
        if (err?.code === "resource_missing") {
          console.warn(
            `[cancelSubscriptionForUser] subscription ${sub.stripeSubscriptionId} already gone — proceeding with purge`
          );
        } else {
          console.error(
            `[cancelSubscriptionForUser] stripe cancel failed for user ${userId}: ${err?.message ?? err}`
          );
          throw err;
        }
      }
    }

    await ctx.scheduler.runAfter(0, internal.users.purgeUserData, {
      userId,
    });
  },
});
