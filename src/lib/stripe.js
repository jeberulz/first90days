import Stripe from "stripe";

let cached = null;

export function getStripe() {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached = new Stripe(secret);
  return cached;
}
