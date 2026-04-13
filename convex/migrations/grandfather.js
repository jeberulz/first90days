import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { isPilotEmail } from "../lib/pilotUser";

/**
 * One-shot launch migration. Flips every user created before the launch
 * cutoff to `billingTier: "pro_legacy"` so they get lifetime Pro access
 * regardless of Stripe state.
 *
 * Run once, immediately before swapping to live Stripe keys:
 *
 *   # Preview what will change without writing:
 *   npx convex run migrations/grandfather:grandfatherExistingUsers '{"dryRun": true}'
 *
 *   # Apply, using "now" as the cutoff:
 *   npx convex run migrations/grandfather:grandfatherExistingUsers '{}'
 *
 *   # Apply with a specific cutoff (ms epoch):
 *   npx convex run migrations/grandfather:grandfatherExistingUsers '{"cutoffMs": 1713000000000}'
 *
 * Idempotent: users already on `pro_legacy` are left alone. Pilot users
 * (matched by email) are always grandfathered, even if they were created
 * after the cutoff — the pilot relationship pre-dates the formal launch.
 */
export const grandfatherExistingUsers = internalMutation({
  args: {
    cutoffMs: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { cutoffMs, dryRun }) => {
    const cutoff = cutoffMs ?? Date.now();
    const preview = dryRun ?? false;

    const users = await ctx.db.query("users").collect();

    let processed = 0;
    let grandfathered = 0;
    let alreadyLegacy = 0;
    let skippedPostCutoff = 0;
    let pilotGrandfathered = 0;

    for (const user of users) {
      processed += 1;

      if (user.billingTier === "pro_legacy") {
        alreadyLegacy += 1;
        continue;
      }

      const isPilot = isPilotEmail(user.email);
      const isPreCutoff = user._creationTime < cutoff;

      if (!isPilot && !isPreCutoff) {
        skippedPostCutoff += 1;
        continue;
      }

      if (!preview) {
        await ctx.db.patch(user._id, {
          billingTier: "pro_legacy",
          grandfatheredAt: Date.now(),
        });
      }

      grandfathered += 1;
      if (isPilot) pilotGrandfathered += 1;
    }

    return {
      processed,
      grandfathered,
      alreadyLegacy,
      skippedPostCutoff,
      pilotGrandfathered,
      cutoffMs: cutoff,
      dryRun: preview,
    };
  },
});
