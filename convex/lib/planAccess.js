/**
 * Plan access helpers — used by every collaboration query/mutation to check
 * whether the current authed user can read or comment on a plan they do not
 * own. Owners always have full access; collaborators must have a row in the
 * planCollaborators table for that plan.
 */

import { auth } from "../auth";

/**
 * Resolve the authed user's access role for a given plan.
 * Returns one of:
 *   - { role: "owner",   userId, plan }
 *   - { role: "manager", userId, plan, collaborator }
 *   - { role: "viewer",  userId, plan, collaborator }
 *   - null  (not authed, plan missing, or no access)
 *
 * Pure read; safe to call from queries.
 */
export async function resolvePlanAccess(ctx, planId) {
  const userId = await auth.getUserId(ctx);
  if (!userId) return null;

  const plan = await ctx.db.get(planId);
  if (!plan) return null;

  if (plan.userId === userId) {
    return { role: "owner", userId, plan };
  }

  const collaborator = await ctx.db
    .query("planCollaborators")
    .withIndex("by_plan_collaborator", (q) =>
      q.eq("planId", planId).eq("collaboratorUserId", userId)
    )
    .unique();

  if (!collaborator) return null;

  // Map the stored role to the access role explicitly. Unknown values
  // collapse to the most restrictive option ("viewer") rather than
  // silently upgrading to "manager" — future-proofs this helper if the
  // schema ever adds another role.
  let role;
  switch (collaborator.role) {
    case "manager":
      role = "manager";
      break;
    case "viewer":
      role = "viewer";
      break;
    default:
      role = "viewer";
      break;
  }

  return {
    role,
    userId,
    plan,
    collaborator,
  };
}

/**
 * Mutation guard: throws if the caller cannot access the plan, otherwise
 * returns the same shape as resolvePlanAccess.
 */
export async function assertPlanAccess(ctx, planId) {
  const access = await resolvePlanAccess(ctx, planId);
  if (!access) throw new Error("Plan not found or access denied");
  return access;
}

/**
 * Owner-only guard. Use for share-management mutations (invite, revoke,
 * remove collaborator) which only the plan owner is allowed to perform.
 */
export async function assertPlanOwner(ctx, planId) {
  const access = await assertPlanAccess(ctx, planId);
  if (access.role !== "owner") {
    throw new Error("Only the plan owner can perform this action");
  }
  return access;
}
