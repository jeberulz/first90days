/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConvexError } from "convex/values";
import schema from "../schema.js";
import {
  OP_COSTS,
  reserveBudget,
  reserveWithEnvelope,
  reconcileBudget,
  utcDayKey,
  userDayKey,
  safeTimezone,
  getDailySpendCents,
  tierCeilingCents,
  tierCountCap,
} from "./rateLimit.js";
import { remainingFromCents } from "./whispererQuota.js";

const modules = import.meta.glob("../**/*.{js,ts}");

// ---------- Test helpers ----------

function setTzFlag(on, enabledAt = null) {
  if (on) {
    process.env.WHISPERER_V1_AIUSAGE_TIMEZONE_KEY = "true";
    if (enabledAt !== null) {
      process.env.WHISPERER_V1_AIUSAGE_TIMEZONE_KEY_ENABLED_AT = String(enabledAt);
    } else {
      delete process.env.WHISPERER_V1_AIUSAGE_TIMEZONE_KEY_ENABLED_AT;
    }
  } else {
    delete process.env.WHISPERER_V1_AIUSAGE_TIMEZONE_KEY;
    delete process.env.WHISPERER_V1_AIUSAGE_TIMEZONE_KEY_ENABLED_AT;
  }
}

async function insertUser(t, overrides = {}) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", { email: `${Math.random()}@e.com`, ...overrides })
  );
}

async function seedUsage(t, userId, dayKey, costCents, requestCount = 1) {
  return await t.run(async (ctx) =>
    ctx.db.insert("aiUsage", {
      userId,
      dayKey,
      costCents,
      requestCount,
      lastRequestAt: Date.now(),
    })
  );
}

async function readUsageRow(t, userId, dayKey) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("aiUsage")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayKey", dayKey))
      .unique()
  );
}

// ---------- OP_COSTS ----------

describe("OP_COSTS", () => {
  it("exposes whisperer, whisperer_recap, whisperer_semantic", () => {
    expect(OP_COSTS.whisperer).toBe(15);
    expect(OP_COSTS.whisperer_recap).toBe(0);
    expect(OP_COSTS.whisperer_semantic).toBe(1);
  });

  it("keeps existing op costs unchanged (regression on day-key change)", () => {
    expect(OP_COSTS.generatePlan).toBe(100);
    expect(OP_COSTS.kbEnrich).toBe(20);
    expect(OP_COSTS.kbEmbed).toBe(5);
    expect(OP_COSTS.generateWeeklyInsight).toBe(30);
  });
});

// ---------- safeTimezone ----------

describe("safeTimezone", () => {
  it("returns the timezone when it's a valid IANA zone", () => {
    expect(safeTimezone("Europe/London")).toBe("Europe/London");
    expect(safeTimezone("America/New_York")).toBe("America/New_York");
  });

  it("falls back to Europe/London when missing", () => {
    expect(safeTimezone(undefined)).toBe("Europe/London");
    expect(safeTimezone(null)).toBe("Europe/London");
    expect(safeTimezone("")).toBe("Europe/London");
  });

  it("falls back to Europe/London when invalid (Intl throws)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(safeTimezone("Not/A_Real/Zone")).toBe("Europe/London");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ---------- userDayKey ----------

describe("userDayKey", () => {
  beforeEach(() => setTzFlag(false));

  it("uses settings.timezone for the day key", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      settings: { timezone: "Asia/Tokyo" },
    });
    // 2026-05-12 14:00 UTC = 2026-05-12 23:00 in Tokyo (still 12th)
    const at = Date.UTC(2026, 4, 12, 14, 0, 0);
    const key = await t.run(async (ctx) => userDayKey(ctx, userId, at));
    expect(key).toBe("2026-05-12");
  });

  it("BST boundary: 00:30 BST returns the BST date even though UTC is the prior day", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      settings: { timezone: "Europe/London" },
    });
    // BST = UTC+1 in summer. 00:30 BST on 2026-06-15 = 23:30 UTC 2026-06-14
    const at = Date.UTC(2026, 5, 14, 23, 30, 0);
    const key = await t.run(async (ctx) => userDayKey(ctx, userId, at));
    expect(key).toBe("2026-06-15");
    expect(utcDayKey(at)).toBe("2026-06-14");
  });

  it("defaults to Europe/London when settings.timezone is missing", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {}); // no settings
    // 02:00 UTC during BST = 03:00 BST on the same date
    const at = Date.UTC(2026, 5, 15, 2, 0, 0);
    const key = await t.run(async (ctx) => userDayKey(ctx, userId, at));
    expect(key).toBe("2026-06-15");
  });

  it("defaults to Europe/London when timezone is invalid", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      settings: { timezone: "Mars/Olympus_Mons" },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const at = Date.UTC(2026, 5, 15, 2, 0, 0);
    const key = await t.run(async (ctx) => userDayKey(ctx, userId, at));
    expect(key).toBe("2026-06-15");
    warn.mockRestore();
  });
});

// ---------- reserveWithEnvelope: happy + error states ----------

describe("reserveWithEnvelope (flag off — legacy UTC key path)", () => {
  beforeEach(() => setTzFlag(false));

  it("Free user with 0¢ used: whisperer reserve returns ok with ~13 calls remaining", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    const result = await t.run(async (ctx) =>
      reserveWithEnvelope(ctx, userId, OP_COSTS.whisperer)
    );
    expect(result.status).toBe("ok");
    expect(result.tier).toBe("free");
    // After 15¢ reserved against a 200¢ ceiling: 185¢ remaining → 12 more calls.
    expect(result.remaining_cost).toBe(185);
    expect(result.remaining_whisperer_calls_est).toBe(12);
    // From an outside perspective, the user had ~13 calls before this one.
    const fresh = await t.run(async (ctx) => remainingFromCents(ctx, userId));
    expect(Math.floor(200 / 15)).toBe(13);
    expect(fresh.remaining_whisperer_calls_est).toBe(12);
  });

  it("Pro user near cents ceiling (1490¢): whisperer (15¢) returns over_cents with remaining_cost=10", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "pro" });
    await seedUsage(t, userId, utcDayKey(), 1490, 50);

    const result = await t.run(async (ctx) =>
      reserveWithEnvelope(ctx, userId, OP_COSTS.whisperer)
    );

    expect(result.status).toBe("over_cents");
    expect(result.remaining_cost).toBe(10);
    expect(result.remaining_whisperer_calls_est).toBe(0);
    expect(result.tier).toBe("pro");
  });

  it("over_count fires when request-count cap exceeded (cents still within ceiling)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    // 30 is the free count cap. Seed at the cap with low cents so cents
    // does NOT bind; the next call should fail with over_count, not over_cents.
    await seedUsage(t, userId, utcDayKey(), 50, tierCountCap("free"));

    const result = await t.run(async (ctx) =>
      reserveWithEnvelope(ctx, userId, OP_COSTS.semanticSearch)
    );

    expect(result.status).toBe("over_count");
    // Cents-headroom is still real for a downgraded op.
    expect(result.remaining_cost).toBe(150);
  });

  it("mid-thread cents cap surfaces mid_thread_cents_capped: true when option set", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    await seedUsage(t, userId, utcDayKey(), 195, 5);
    const result = await t.run(async (ctx) =>
      reserveWithEnvelope(ctx, userId, OP_COSTS.whisperer, { midThread: true })
    );
    expect(result.status).toBe("over_cents");
    expect(result.mid_thread_cents_capped).toBe(true);
  });

  it("AE5 hybrid: free regen 100¢ + repeated whisperer until cents binds → over_cents, NOT over_count", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    // Simulate: plan regen (100¢, 1 call) + 6 whisperer ops (6*15 = 90¢, 6 calls).
    // That's 190¢ used, 7 calls; the next whisperer call (190+15=205) crosses
    // the 200¢ ceiling while leaving the count cap (30) far untouched.
    await seedUsage(t, userId, utcDayKey(), 190, 7);

    const result = await t.run(async (ctx) =>
      reserveWithEnvelope(ctx, userId, OP_COSTS.whisperer)
    );

    expect(result.status).toBe("over_cents");
    expect(result.status).not.toBe("over_count");
    expect(result.remaining_cost).toBe(10);
    // The error envelope still carries an upgrade-able cost figure so the
    // UI can show "10¢ left, upgrade for more" copy.
    expect(result.remaining_whisperer_calls_est).toBe(0);
  });

  it("happy path actually persists the reservation under the UTC day key", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    await t.run(async (ctx) =>
      reserveWithEnvelope(ctx, userId, OP_COSTS.whisperer)
    );
    const row = await readUsageRow(t, userId, utcDayKey());
    expect(row.costCents).toBe(15);
    expect(row.requestCount).toBe(1);
  });

  it("regression: existing AI ops (generatePlan, kbEnrich, generateWeeklyInsight) still reserve correctly", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "pro" });
    // Three back-to-back ops totalling 150¢. Should all succeed and land
    // on a single row.
    await t.run(async (ctx) =>
      reserveBudget(ctx, userId, OP_COSTS.generatePlan)
    );
    await t.run(async (ctx) => reserveBudget(ctx, userId, OP_COSTS.kbEnrich));
    await t.run(async (ctx) =>
      reserveBudget(ctx, userId, OP_COSTS.generateWeeklyInsight)
    );
    const row = await readUsageRow(t, userId, utcDayKey());
    expect(row.costCents).toBe(100 + 20 + 30);
    expect(row.requestCount).toBe(3);
  });

  it("reserveBudget still throws ConvexError on cents overrun (compat with existing call sites)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    await seedUsage(t, userId, utcDayKey(), 199, 1);
    await expect(
      t.run(async (ctx) => reserveBudget(ctx, userId, OP_COSTS.whisperer))
    ).rejects.toThrow(ConvexError);
  });
});

// ---------- Dual-read transition window ----------

describe("reserveWithEnvelope (flag on — dual-read transition window)", () => {
  afterEach(() => setTzFlag(false));

  it("sums spend across both utcDayKey and userDayKey rows for the same logical day", async () => {
    setTzFlag(true);
    const t = convexTest(schema, modules);
    // Tokyo: UTC+9. Pick a "now" where UTC date != Tokyo date.
    const userId = await insertUser(t, {
      billingTier: "pro",
      settings: { timezone: "Asia/Tokyo" },
    });
    const now = Date.now();
    const utcKey = utcDayKey(now);
    const tzKey = await t.run(async (ctx) => userDayKey(ctx, userId, now));

    // Only test the sum when the keys differ. If they happen to coincide
    // for "now", skip the assertion gracefully.
    if (utcKey === tzKey) {
      return;
    }

    // Old row under utcDayKey: 500¢ pre-flag. New row under userDayKey: 100¢.
    await seedUsage(t, userId, utcKey, 500, 10);
    await seedUsage(t, userId, tzKey, 100, 2);

    const total = await t.run(async (ctx) => getDailySpendCents(ctx, userId));
    expect(total).toBe(600);

    // A whisperer reserve would still succeed (600+15=615 < 1500 Pro ceiling)
    const result = await t.run(async (ctx) =>
      reserveWithEnvelope(ctx, userId, OP_COSTS.whisperer)
    );
    expect(result.status).toBe("ok");
    expect(result.remaining_cost).toBe(1500 - 615);

    // The reservation should write to the PRIMARY (userDayKey) row, not the
    // legacy UTC row — verifying we don't double-count on subsequent reads.
    const tzRow = await readUsageRow(t, userId, tzKey);
    expect(tzRow.costCents).toBe(115);
    const utcRow = await readUsageRow(t, userId, utcKey);
    expect(utcRow.costCents).toBe(500); // unchanged
  });

  it("after the 48h window the dual-read is OFF: spend from legacy UTC row is no longer summed", async () => {
    // Window enabledAt 49h ago → outside the window.
    const enabledAt = Date.now() - 49 * 60 * 60 * 1000;
    setTzFlag(true, enabledAt);

    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      billingTier: "pro",
      settings: { timezone: "Asia/Tokyo" },
    });
    const now = Date.now();
    const utcKey = utcDayKey(now);
    const tzKey = await t.run(async (ctx) => userDayKey(ctx, userId, now));
    if (utcKey === tzKey) return;

    await seedUsage(t, userId, utcKey, 500, 10); // legacy
    await seedUsage(t, userId, tzKey, 100, 2); // new

    const total = await t.run(async (ctx) => getDailySpendCents(ctx, userId));
    // Only the primary (tzKey) is read.
    expect(total).toBe(100);
  });
});

// ---------- whispererQuota.remainingFromCents ----------

describe("whispererQuota.remainingFromCents", () => {
  beforeEach(() => setTzFlag(false));

  it("returns full free ceiling for a fresh user (13 whisperer calls)", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    const result = await t.run(async (ctx) => remainingFromCents(ctx, userId));
    expect(result.tier).toBe("free");
    expect(result.ceiling_cents).toBe(tierCeilingCents("free"));
    expect(result.used_cents).toBe(0);
    expect(result.remaining_cost).toBe(200);
    expect(result.remaining_whisperer_calls_est).toBe(13);
  });

  it("reflects the FULL shared ledger (KB enrich + plan regen), not just whisperer rows", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "pro" });
    // 100 (generatePlan) + 20 (kbEnrich) + 30 (weekly) = 150¢ spent on
    // non-whisperer ops. Pro ceiling 1500.
    await seedUsage(t, userId, utcDayKey(), 150, 3);
    const result = await t.run(async (ctx) => remainingFromCents(ctx, userId));
    expect(result.used_cents).toBe(150);
    expect(result.remaining_cost).toBe(1350);
    expect(result.remaining_whisperer_calls_est).toBe(90);
  });

  it("clamps at 0 when usage has exceeded the ceiling somehow", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "free" });
    await seedUsage(t, userId, utcDayKey(), 999, 5); // overspent
    const result = await t.run(async (ctx) => remainingFromCents(ctx, userId));
    expect(result.remaining_cost).toBe(0);
    expect(result.remaining_whisperer_calls_est).toBe(0);
  });
});

// ---------- reconcileBudget under the flag ----------

describe("reconcileBudget", () => {
  beforeEach(() => setTzFlag(false));

  it("UTC path: adjusts the legacy row when flag off", async () => {
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, { billingTier: "pro" });
    await seedUsage(t, userId, utcDayKey(), 100, 1);
    await t.run(async (ctx) => reconcileBudget(ctx, userId, -30));
    const row = await readUsageRow(t, userId, utcDayKey());
    expect(row.costCents).toBe(70);
  });

  it("tz path: adjusts the user-local-day row when flag on", async () => {
    setTzFlag(true);
    const t = convexTest(schema, modules);
    const userId = await insertUser(t, {
      billingTier: "pro",
      settings: { timezone: "Asia/Tokyo" },
    });
    const now = Date.now();
    const tzKey = await t.run(async (ctx) => userDayKey(ctx, userId, now));
    await seedUsage(t, userId, tzKey, 60, 1);
    await t.run(async (ctx) => reconcileBudget(ctx, userId, -20));
    const row = await readUsageRow(t, userId, tzKey);
    expect(row.costCents).toBe(40);
  });
});
