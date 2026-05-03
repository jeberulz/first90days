import { NextResponse } from "next/server";
import { fetchQuery, fetchAction } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getStripe } from "@/lib/stripe";

export async function POST(req) {
  const token = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const interval = payload?.interval;
  if (interval !== "monthly" && interval !== "annual") {
    return NextResponse.json(
      { error: "interval must be 'monthly' or 'annual'" },
      { status: 400 }
    );
  }

  let viewer;
  try {
    viewer = await fetchQuery(api.users.viewer, {}, { token });
  } catch (err) {
    console.error("[create-checkout-session] viewer fetch failed:", err);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!viewer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (viewer.isAnonymous) {
    return NextResponse.json(
      { error: "Verify your email before upgrading to Pro." },
      { status: 403 }
    );
  }

  const priceId =
    interval === "annual"
      ? process.env.STRIPE_PRICE_PRO_ANNUAL
      : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!priceId) {
    console.error(
      `[create-checkout-session] price id missing for interval=${interval}`
    );
    return NextResponse.json(
      { error: "billing not configured" },
      { status: 500 }
    );
  }

  let customerId;
  try {
    customerId = await fetchAction(
      api.billingActions.ensureStripeCustomer,
      {},
      { token }
    );
  } catch (err) {
    console.error(
      "[create-checkout-session] ensureStripeCustomer failed:",
      err
    );
    return NextResponse.json(
      { error: "Could not create Stripe customer" },
      { status: 500 }
    );
  }

  // Trial is local (no-card, 7 days) and tracked on the user record. By the
  // time the user reaches Stripe Checkout they are converting to paid — no
  // Stripe-hosted trial is configured here. trialUsedAt is still set by the
  // checkout.session.completed webhook so the local trial cannot be reused.
  const subscriptionData = {
    metadata: { convexUserId: String(viewer._id) },
  };

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: { address: "auto", name: "auto" },
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancel`,
      client_reference_id: String(viewer._id),
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(
      "[create-checkout-session] stripe.checkout.sessions.create failed:",
      err
    );
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 }
    );
  }
}
