import { convexTest } from "convex-test";
import { expect, describe, it } from "vitest";
import schema from "../schema.js";
import { internal } from "../_generated/api";
import { PILOT_USER_EMAIL } from "../lib/pilotUser.js";

describe("grandfatherExistingUsers migration", () => {
  it("flips pre-cutoff users to pro_legacy and leaves post-cutoff alone", async () => {
    const t = convexTest(schema);

    // Insert one "pre-cutoff" user now, capture its creation time.
    const preId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "old@example.com" })
    );
    const preUser = await t.run(async (ctx) => ctx.db.get(preId));

    // Cutoff is 1s after preUser was created → preUser qualifies.
    const cutoffMs = preUser._creationTime + 1000;

    // A second user inserted AFTER the cutoff should not be grandfathered.
    // We simulate this by running the migration with a cutoff that is
    // already in the past relative to the second insert.
    const postId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "new@example.com" })
    );

    // Move cutoff to sit between the two users.
    // preUser._creationTime < cutoffMs < postUser._creationTime
    // The default Math.now() here differs per test harness; rely on
    // insertion order and use the midpoint.
    const postUser = await t.run(async (ctx) => ctx.db.get(postId));
    expect(postUser._creationTime).toBeGreaterThan(preUser._creationTime);
    const midpoint =
      Math.floor((preUser._creationTime + postUser._creationTime) / 2) + 1;

    const summary = await t.mutation(
      internal.migrations.grandfather.grandfatherExistingUsers,
      { cutoffMs: midpoint }
    );

    expect(summary.processed).toBe(2);
    expect(summary.grandfathered).toBe(1);
    expect(summary.alreadyLegacy).toBe(0);
    expect(summary.skippedPostCutoff).toBe(1);

    const preAfter = await t.run(async (ctx) => ctx.db.get(preId));
    const postAfter = await t.run(async (ctx) => ctx.db.get(postId));
    expect(preAfter.billingTier).toBe("pro_legacy");
    expect(preAfter.grandfatheredAt).toBeTypeOf("number");
    expect(postAfter.billingTier).toBeUndefined();
    expect(postAfter.grandfatheredAt).toBeUndefined();
  });

  it("always grandfathers the pilot user even when created after cutoff", async () => {
    const t = convexTest(schema);

    const pilotId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: PILOT_USER_EMAIL })
    );

    // Cutoff set to well before the pilot user's creation time.
    const cutoffMs = 1;

    const summary = await t.mutation(
      internal.migrations.grandfather.grandfatherExistingUsers,
      { cutoffMs }
    );

    expect(summary.grandfathered).toBe(1);
    expect(summary.pilotGrandfathered).toBe(1);

    const user = await t.run(async (ctx) => ctx.db.get(pilotId));
    expect(user.billingTier).toBe("pro_legacy");
  });

  it("is idempotent: users already pro_legacy are left alone", async () => {
    const t = convexTest(schema);

    const existingLegacyId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "legacy@example.com",
        billingTier: "pro_legacy",
        grandfatheredAt: 1000,
      })
    );

    // Use a cutoff that would otherwise qualify them.
    const summary = await t.mutation(
      internal.migrations.grandfather.grandfatherExistingUsers,
      { cutoffMs: Date.now() + 10000 }
    );

    expect(summary.alreadyLegacy).toBe(1);
    expect(summary.grandfathered).toBe(0);

    const user = await t.run(async (ctx) => ctx.db.get(existingLegacyId));
    // grandfatheredAt should not have been overwritten.
    expect(user.grandfatheredAt).toBe(1000);
  });

  it("dryRun reports the counts without writing", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "dry@example.com" })
    );

    const summary = await t.mutation(
      internal.migrations.grandfather.grandfatherExistingUsers,
      { cutoffMs: Date.now() + 10000, dryRun: true }
    );

    expect(summary.dryRun).toBe(true);
    expect(summary.grandfathered).toBe(1);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    // Nothing should have been patched
    expect(user.billingTier).toBeUndefined();
    expect(user.grandfatheredAt).toBeUndefined();
  });

  it("skips users created exactly at the cutoff timestamp (strict less-than)", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "boundary@example.com" })
    );
    const user = await t.run(async (ctx) => ctx.db.get(userId));

    // Cutoff equals creation time → should NOT grandfather (strict <).
    const summary = await t.mutation(
      internal.migrations.grandfather.grandfatherExistingUsers,
      { cutoffMs: user._creationTime }
    );

    expect(summary.grandfathered).toBe(0);
    expect(summary.skippedPostCutoff).toBe(1);
  });
});
