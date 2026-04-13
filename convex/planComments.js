/**
 * Plan comments — threaded discussion on the plan, a phase, a week, an
 * activity, or a goal. Owners and any planCollaborators can read and write
 * comments on the same plan; only an author or the plan owner can delete a
 * comment, and either side may resolve/unresolve a thread.
 *
 * targetId is stored as a string because Convex doesn't support a union of
 * Id<T> validators in a single column. The targetType field discriminates
 * how to interpret the string at read time, and `add` validates the target
 * row exists and belongs to the same plan before inserting.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { resolvePlanAccess } from "./lib/planAccess";

const TARGET_TYPES = ["plan", "phase", "week", "activity", "goal"];

const TARGET_TYPE_VALIDATOR = v.union(
  v.literal("plan"),
  v.literal("phase"),
  v.literal("week"),
  v.literal("activity"),
  v.literal("goal")
);

async function loadAndValidateTarget(ctx, planId, targetType, targetId) {
  if (!TARGET_TYPES.includes(targetType)) {
    throw new Error(`Unknown target type: ${targetType}`);
  }
  if (targetType === "plan") {
    if (targetId !== planId) {
      throw new Error("Plan target id must match the planId");
    }
    return;
  }

  const tableByType = {
    phase: "phases",
    week: "weeks",
    activity: "activities",
    goal: "goals",
  };
  const table = tableByType[targetType];

  // normalizeId returns null if `targetId` isn't a valid Id<table>, which
  // catches mismatches like commenting on a week with an activity id.
  const normalized = ctx.db.normalizeId(table, targetId);
  if (!normalized) throw new Error(`${targetType} id is invalid for this target type`);

  const doc = await ctx.db.get(normalized);
  if (!doc) throw new Error(`${targetType} not found`);

  if (targetType === "goal") {
    // Goals are owned by the user, not the plan; cross-check against the
    // plan owner instead of a planId field.
    const plan = await ctx.db.get(planId);
    if (!plan || doc.userId !== plan.userId) {
      throw new Error("Goal does not belong to this plan");
    }
    return;
  }
  if (doc.planId !== planId) {
    throw new Error(`${targetType} does not belong to this plan`);
  }
}

export const add = mutation({
  args: {
    planId: v.id("plans"),
    targetType: TARGET_TYPE_VALIDATOR,
    targetId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await resolvePlanAccess(ctx, args.planId);
    if (!access) throw new Error("Plan not found or access denied");

    const trimmed = args.body.trim();
    if (!trimmed) throw new Error("Comment cannot be empty");
    if (trimmed.length > 5000) throw new Error("Comment is too long");

    await loadAndValidateTarget(ctx, args.planId, args.targetType, args.targetId);

    return await ctx.db.insert("planComments", {
      planId: args.planId,
      authorUserId: access.userId,
      authorRole: access.role,
      targetType: args.targetType,
      targetId: args.targetId,
      body: trimmed,
    });
  },
});

/**
 * List comments for a single target. Used by inline thread UIs on activities,
 * goals, and weeks.
 */
export const listForTarget = query({
  args: {
    planId: v.id("plans"),
    targetType: TARGET_TYPE_VALIDATOR,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await resolvePlanAccess(ctx, args.planId);
    if (!access) return [];

    const rows = await ctx.db
      .query("planComments")
      .withIndex("by_target", (q) =>
        q
          .eq("planId", args.planId)
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
      )
      .collect();

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const author = await ctx.db.get(row.authorUserId);
        return {
          _id: row._id,
          body: row.body,
          createdAt: row._creationTime,
          authorUserId: row.authorUserId,
          authorName: author?.name ?? null,
          authorRole: row.authorRole,
          resolvedAt: row.resolvedAt ?? null,
          isMine: row.authorUserId === access.userId,
          canDelete:
            row.authorUserId === access.userId || access.role === "owner",
        };
      })
    );

    return enriched.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * List every comment on a plan (used by the dashboard summary bubble and the
 * shared-with-me reviewer view). Returns small, denormalized rows so the
 * client can group/count without fanning out additional queries.
 */
export const listForPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const access = await resolvePlanAccess(ctx, args.planId);
    if (!access) return [];

    const rows = await ctx.db
      .query("planComments")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const author = await ctx.db.get(row.authorUserId);
        return {
          _id: row._id,
          body: row.body,
          createdAt: row._creationTime,
          targetType: row.targetType,
          targetId: row.targetId,
          authorName: author?.name ?? null,
          authorRole: row.authorRole,
          resolvedAt: row.resolvedAt ?? null,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const resolve = mutation({
  args: { id: v.id("planComments") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Comment not found");
    const access = await resolvePlanAccess(ctx, row.planId);
    if (!access) throw new Error("Access denied");

    await ctx.db.patch(args.id, {
      resolvedAt: Date.now(),
      resolvedByUserId: userId,
    });
  },
});

export const reopen = mutation({
  args: { id: v.id("planComments") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Comment not found");
    const access = await resolvePlanAccess(ctx, row.planId);
    if (!access) throw new Error("Access denied");

    await ctx.db.patch(args.id, {
      resolvedAt: undefined,
      resolvedByUserId: undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("planComments") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Comment not found");
    const access = await resolvePlanAccess(ctx, row.planId);
    if (!access) throw new Error("Access denied");

    if (row.authorUserId !== userId && access.role !== "owner") {
      throw new Error("Only the author or plan owner can delete this comment");
    }

    await ctx.db.delete(args.id);
  },
});
