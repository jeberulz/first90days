import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "./stripeWebhook.js";

const SECRET = "whsec_test_secret_key";
const BODY = JSON.stringify({
  id: "evt_test_1",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1" } },
});

// Mirrors Stripe's v1 scheme: HMAC-SHA256 over `<timestamp>.<body>`.
async function sign(body, secret, timestampSec) {
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
    encoder.encode(`${timestampSec}.${body}`)
  );
  return Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function validHeader(body = BODY, secret = SECRET, ts = nowSec()) {
  return `t=${ts},v1=${await sign(body, secret, ts)}`;
}

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed payload", async () => {
    const header = await validHeader();
    await expect(
      verifyStripeSignature(BODY, header, SECRET)
    ).resolves.toBeUndefined();
  });

  it("rejects a tampered body", async () => {
    const header = await validHeader();
    const tampered = BODY.replace("sub_1", "sub_2");
    await expect(
      verifyStripeSignature(tampered, header, SECRET)
    ).rejects.toThrow("signature mismatch");
  });

  it("rejects a signature made with the wrong secret", async () => {
    const header = await validHeader(BODY, "whsec_attacker_guess");
    await expect(verifyStripeSignature(BODY, header, SECRET)).rejects.toThrow(
      "signature mismatch"
    );
  });

  it("rejects a replayed signature with a swapped timestamp", async () => {
    // Valid sig for ts, but header claims a different (fresh) timestamp —
    // the timestamp is part of the signed payload, so this must fail.
    const ts = nowSec() - 60;
    const sig = await sign(BODY, SECRET, ts);
    const header = `t=${nowSec()},v1=${sig}`;
    await expect(verifyStripeSignature(BODY, header, SECRET)).rejects.toThrow(
      "signature mismatch"
    );
  });

  it("rejects a stale timestamp outside the 5-minute tolerance", async () => {
    const stale = nowSec() - 301;
    const header = await validHeader(BODY, SECRET, stale);
    await expect(verifyStripeSignature(BODY, header, SECRET)).rejects.toThrow(
      "timestamp outside tolerance window"
    );
  });

  it("accepts a slightly future-dated timestamp (clock skew, Stripe SDK semantics)", async () => {
    const future = nowSec() + 120;
    const header = await validHeader(BODY, SECRET, future);
    await expect(
      verifyStripeSignature(BODY, header, SECRET)
    ).resolves.toBeUndefined();
  });

  it("rejects a missing header", async () => {
    await expect(verifyStripeSignature(BODY, null, SECRET)).rejects.toThrow(
      "missing stripe-signature header"
    );
  });

  it("rejects a header without a timestamp", async () => {
    const sig = await sign(BODY, SECRET, nowSec());
    await expect(
      verifyStripeSignature(BODY, `v1=${sig}`, SECRET)
    ).rejects.toThrow("malformed signature header");
  });

  it("rejects a header without any v1 signature", async () => {
    await expect(
      verifyStripeSignature(BODY, `t=${nowSec()}`, SECRET)
    ).rejects.toThrow("malformed signature header");
  });

  it("rejects a non-numeric timestamp", async () => {
    const sig = await sign(BODY, SECRET, nowSec());
    await expect(
      verifyStripeSignature(BODY, `t=garbage,v1=${sig}`, SECRET)
    ).rejects.toThrow("invalid timestamp in signature header");
  });

  it("accepts when any one of multiple v1 signatures matches (secret rotation)", async () => {
    const ts = nowSec();
    const good = await sign(BODY, SECRET, ts);
    const old = await sign(BODY, "whsec_previous_secret", ts);
    const header = `t=${ts},v1=${old},v1=${good}`;
    await expect(
      verifyStripeSignature(BODY, header, SECRET)
    ).resolves.toBeUndefined();
  });

  it("rejects a truncated signature (length mismatch)", async () => {
    const ts = nowSec();
    const good = await sign(BODY, SECRET, ts);
    const header = `t=${ts},v1=${good.slice(0, 32)}`;
    await expect(verifyStripeSignature(BODY, header, SECRET)).rejects.toThrow(
      "signature mismatch"
    );
  });
});
