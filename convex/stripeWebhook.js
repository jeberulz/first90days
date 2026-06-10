import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Stripe webhook endpoint. Runs in the Convex v8 runtime, so we verify the
 * signature manually with Web Crypto rather than pulling in the Node-only
 * parts of the Stripe SDK. Algorithm matches the one documented at
 * https://stripe.com/docs/webhooks/signatures (v1 scheme).
 *
 * Header format: `t=<unix_ts>,v1=<hex_hmac>,v1=<optional_second_sig>`
 * Signed payload: `<timestamp>.<raw_body>` via HMAC-SHA256 using the webhook
 * signing secret.
 */

const DEFAULT_TOLERANCE_SECONDS = 300; // 5 min — matches Stripe SDK default

function parseSignatureHeader(header) {
  const parts = {};
  for (const piece of header.split(",")) {
    const [key, value] = piece.split("=");
    if (!key || value === undefined) continue;
    if (!parts[key]) parts[key] = [];
    parts[key].push(value);
  }
  return parts;
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmacHex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyStripeSignature(body, header, secret) {
  if (!header) throw new Error("missing stripe-signature header");

  const parts = parseSignatureHeader(header);
  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) {
    throw new Error("malformed signature header");
  }

  const timestampSec = Number(timestamp);
  if (!Number.isFinite(timestampSec)) {
    throw new Error("invalid timestamp in signature header");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > DEFAULT_TOLERANCE_SECONDS) {
    throw new Error("timestamp outside tolerance window");
  }

  const expected = await computeHmacHex(secret, `${timestamp}.${body}`);
  const match = signatures.some((sig) => timingSafeEqualHex(sig, expected));
  if (!match) throw new Error("signature mismatch");
}

export const stripeWebhook = httpAction(async (ctx, req) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripeWebhook] STRIPE_WEBHOOK_SECRET not configured");
    return new Response("webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  try {
    await verifyStripeSignature(body, signature, secret);
  } catch (err) {
    return new Response(
      `signature verification failed: ${err.message ?? err}`,
      { status: 400 }
    );
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("invalid JSON payload", { status: 400 });
  }

  if (!event?.id || !event?.type || !event?.data?.object) {
    return new Response("malformed stripe event", { status: 400 });
  }

  try {
    await ctx.runMutation(internal.billing.processStripeEvent, {
      eventId: event.id,
      eventType: event.type,
      payload: event.data.object,
    });
  } catch (err) {
    // Return 500 so Stripe retries. The failed mutation rolled back all of
    // its writes (including the billingWebhookLog row), so the retry gets a
    // clean idempotency slate.
    console.error(
      `[stripeWebhook] processStripeEvent failed for ${event.id}: ${err?.message ?? err}`
    );
    return new Response("internal error", { status: 500 });
  }

  return new Response(null, { status: 200 });
});
