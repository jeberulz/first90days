// Internal mutation wrapper around lib/rateLimit so actions can call it
// via `ctx.runMutation(internal.rateLimit.reserve, …)`.

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { reserveBudget, reconcileBudget, OP_COSTS } from "./lib/rateLimit.js";

export const reserve = internalMutation({
  args: {
    userId: v.id("users"),
    op: v.string(),
    estimatedCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cost =
      typeof args.estimatedCents === "number"
        ? args.estimatedCents
        : OP_COSTS[args.op] ?? 50;
    await reserveBudget(ctx, args.userId, cost);
    return { reservedCents: cost };
  },
});

export const reconcile = internalMutation({
  args: {
    userId: v.id("users"),
    deltaCents: v.number(),
  },
  handler: async (ctx, args) => {
    await reconcileBudget(ctx, args.userId, args.deltaCents);
  },
});
