import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { resolvePlanAccess } from "./lib/planAccess";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Goals belonging to the owner of a plan, looked up via plan id. Used by the
 * shared (collaborator) view so a manager can see + sign off on goals
 * without owning the plan. Authorization is delegated to resolvePlanAccess.
 */
export const listForPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const access = await resolvePlanAccess(ctx, args.planId);
    if (!access) return [];

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", access.plan.userId))
      .collect();

    // Enrich each goal with the approver's display name so the UI can
    // render "Approved by Jane Doe" without an extra round trip.
    return await Promise.all(
      goals.map(async (g) => {
        let approverName = null;
        if (g.approvalDecidedByUserId) {
          const approver = await ctx.db.get(g.approvalDecidedByUserId);
          approverName = approver?.name ?? approver?.email ?? null;
        }
        return {
          ...g,
          approverName,
          viewerRole: access.role,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    targetPhase: v.number(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("goals", {
      userId,
      ...args,
      status: "not_started",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("goals"),
    title: v.optional(v.string()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    completedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== userId) throw new Error("Goal not found");

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    // If the owner edits a goal that was already approved or had pending
    // changes-requested feedback, reset approval state — the manager
    // should re-confirm the new wording.
    if (
      (filtered.title !== undefined || filtered.notes !== undefined) &&
      goal.approvalStatus &&
      goal.approvalStatus !== "none"
    ) {
      filtered.approvalStatus = "none";
      filtered.approvalDecidedAt = undefined;
      filtered.approvalDecidedByUserId = undefined;
      filtered.approvalNote = undefined;
      filtered.approvalRequestedAt = undefined;
    }

    await ctx.db.patch(id, filtered);
  },
});

// ── Sign-off lifecycle ───────────────────────────────────────────────────
// requestApproval / withdrawApprovalRequest are owner-only.
// approveGoal / requestChanges are reviewer-only (must be a collaborator,
// not the owner). Every transition is server-enforced so a misbehaving
// client cannot self-approve a goal.

async function loadOwnedGoal(ctx, goalId) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const goal = await ctx.db.get(goalId);
  if (!goal || goal.userId !== userId) throw new Error("Goal not found");
  return { userId, goal };
}

async function loadGoalAsReviewer(ctx, goalId) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const goal = await ctx.db.get(goalId);
  if (!goal) throw new Error("Goal not found");

  // Reviewer sign-off is only meaningful in the context of an active plan
  // shared with this user. We look up the goal owner's plan and check
  // collaborator access on it.
  const plan = await ctx.db
    .query("plans")
    .withIndex("by_user", (q) => q.eq("userId", goal.userId))
    .first();
  if (!plan) throw new Error("Plan not found for this goal");

  const access = await resolvePlanAccess(ctx, plan._id);
  if (!access) throw new Error("Access denied");
  if (access.role === "owner") {
    throw new Error("The plan owner can't approve their own goals");
  }
  // Sign-off is a manager-only privilege. Viewers can read shared goals
  // but cannot approve or send them back for changes.
  if (access.role !== "manager") {
    throw new Error("Only managers can sign off on goals");
  }

  return { userId, goal, plan, role: access.role };
}

export const requestApproval = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const { goal } = await loadOwnedGoal(ctx, args.id);

    if (goal.approvalStatus === "approved") {
      throw new Error("This goal is already approved");
    }
    if (goal.approvalStatus === "requested") {
      // Idempotent — already in flight.
      return;
    }

    await ctx.db.patch(args.id, {
      approvalStatus: "requested",
      approvalRequestedAt: Date.now(),
      // Wipe any prior decision so the UI doesn't show stale "rejected by …"
      approvalDecidedAt: undefined,
      approvalDecidedByUserId: undefined,
      approvalNote: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.emailActions.sendGoalApprovalRequestEmail, {
      goalId: args.id,
    });
  },
});

export const withdrawApprovalRequest = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const { goal } = await loadOwnedGoal(ctx, args.id);
    if (goal.approvalStatus !== "requested") return;

    await ctx.db.patch(args.id, {
      approvalStatus: "none",
      approvalRequestedAt: undefined,
    });
  },
});

export const approveGoal = mutation({
  args: {
    id: v.id("goals"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, goal } = await loadGoalAsReviewer(ctx, args.id);
    if (goal.approvalStatus !== "requested") {
      throw new Error("Only goals awaiting approval can be approved");
    }

    await ctx.db.patch(args.id, {
      approvalStatus: "approved",
      approvalDecidedAt: Date.now(),
      approvalDecidedByUserId: userId,
      approvalNote: args.note?.trim() || undefined,
    });

    await ctx.scheduler.runAfter(0, internal.emailActions.sendGoalDecisionEmail, {
      goalId: args.id,
    });
  },
});

export const requestChanges = mutation({
  args: {
    id: v.id("goals"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.note.trim();
    if (!trimmed) throw new Error("Add a note explaining what to change");

    const { userId, goal } = await loadGoalAsReviewer(ctx, args.id);
    if (goal.approvalStatus !== "requested") {
      throw new Error("Only goals awaiting approval can be sent back");
    }

    await ctx.db.patch(args.id, {
      approvalStatus: "changes_requested",
      approvalDecidedAt: Date.now(),
      approvalDecidedByUserId: userId,
      approvalNote: trimmed,
    });

    await ctx.scheduler.runAfter(0, internal.emailActions.sendGoalDecisionEmail, {
      goalId: args.id,
    });
  },
});
