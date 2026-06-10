/**
 * Manager-alignment workspace: invitations + collaborators.
 *
 * Flow:
 *   1. Plan owner calls `inviteByEmail` — creates a pending planInvitations
 *      row with a random token and 14-day expiry, returns the token to the
 *      client so the owner can copy a share link.
 *   2. Recipient opens /invite/<token>. Public `getByToken` exposes a
 *      sanitized preview (owner name, plan title, status). After auth, the
 *      page calls `acceptInvitation` which exchanges the token for a
 *      planCollaborators row.
 *   3. Owner can `listInvitations`, `listCollaborators`, `revokeInvitation`,
 *      and `removeCollaborator`.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { assertPlanOwner } from "./lib/planAccess";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const TOKEN_BYTES = 24; // 48 hex chars

function generateToken() {
  // crypto.getRandomValues is available in the Convex V8 runtime and in
  // edge runtimes; this gives 192 bits of entropy, comfortably enough for
  // a single-use share link.
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ── Owner-side: invite management ────────────────────────────────────────

export const inviteByEmail = mutation({
  args: {
    planId: v.id("plans"),
    email: v.string(),
    role: v.optional(v.union(v.literal("manager"), v.literal("viewer"))),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertPlanOwner(ctx, args.planId);

    const email = normalizeEmail(args.email);
    if (!email || !email.includes("@")) {
      throw new Error("A valid email is required");
    }

    // If there's already a pending invite for this email on this plan,
    // refresh its expiry and return the existing token instead of creating
    // a duplicate. Keeps the share link stable for the owner.
    const existing = await ctx.db
      .query("planInvitations")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const stillPending = existing.find(
      (inv) => inv.invitedEmail === email && inv.status === "pending"
    );

    const now = Date.now();
    const expiresAt = now + INVITE_TTL_MS;

    if (stillPending) {
      await ctx.db.patch(stillPending._id, {
        expiresAt,
        message: args.message ?? stillPending.message,
        role: args.role ?? stillPending.role,
      });
      return { token: stillPending.token, invitationId: stillPending._id, refreshed: true };
    }

    const token = generateToken();
    const invitationId = await ctx.db.insert("planInvitations", {
      planId: args.planId,
      ownerUserId: userId,
      invitedEmail: email,
      token,
      role: args.role ?? "manager",
      status: "pending",
      message: args.message,
      createdAt: now,
      expiresAt,
    });

    await ctx.scheduler.runAfter(0, internal.emailActions.sendManagerInviteEmail, {
      invitationId,
    });

    return { token, invitationId, refreshed: false };
  },
});

export const listInvitations = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const access = await assertPlanOwnerSafe(ctx, args.planId);
    if (!access) return [];

    const rows = await ctx.db
      .query("planInvitations")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const now = Date.now();
    return rows
      .map((inv) => ({
        _id: inv._id,
        invitedEmail: inv.invitedEmail,
        role: inv.role,
        status:
          inv.status === "pending" && inv.expiresAt < now
            ? "expired"
            : inv.status,
        token: inv.token,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const revokeInvitation = mutation({
  args: { invitationId: v.id("planInvitations") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const inv = await ctx.db.get(args.invitationId);
    if (!inv) throw new Error("Invitation not found");
    if (inv.ownerUserId !== userId) {
      throw new Error("Only the plan owner can revoke invitations");
    }

    await ctx.db.patch(args.invitationId, { status: "revoked" });
  },
});

// ── Owner-side: collaborator management ──────────────────────────────────

export const listCollaborators = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const access = await assertPlanOwnerSafe(ctx, args.planId);
    if (!access) return [];

    const rows = await ctx.db
      .query("planCollaborators")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const user = await ctx.db.get(row.collaboratorUserId);
        return {
          _id: row._id,
          collaboratorUserId: row.collaboratorUserId,
          role: row.role,
          acceptedAt: row.acceptedAt,
          name: user?.name ?? null,
          email: user?.email ?? row.collaboratorEmail ?? null,
        };
      })
    );

    return enriched.sort((a, b) => b.acceptedAt - a.acceptedAt);
  },
});

export const removeCollaborator = mutation({
  args: { collaboratorRowId: v.id("planCollaborators") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const row = await ctx.db.get(args.collaboratorRowId);
    if (!row) throw new Error("Collaborator not found");
    if (row.ownerUserId !== userId) {
      throw new Error("Only the plan owner can remove collaborators");
    }

    // Sweep comments authored by the removed collaborator on this plan
    // (or anything within it) so their voice doesn't linger after the
    // owner has explicitly cut access. Walk by_author and filter to the
    // plan in memory — comments-per-user is small in practice.
    const authored = await ctx.db
      .query("planComments")
      .withIndex("by_author", (q) => q.eq("authorUserId", row.collaboratorUserId))
      .collect();
    for (const c of authored) {
      if (c.planId === row.planId) {
        await ctx.db.delete(c._id);
      }
    }

    // Revoke the underlying invitation so the removed user can't simply
    // replay the original token and re-insert themselves as a
    // collaborator. Without this, acceptInvitation sees
    // inv.status === "accepted" && inv.acceptedByUserId === userId, no
    // existing collaborator row, and quietly recreates access.
    if (row.invitationId) {
      const inv = await ctx.db.get(row.invitationId);
      if (inv && inv.status !== "revoked") {
        await ctx.db.patch(row.invitationId, { status: "revoked" });
      }
    }

    await ctx.db.delete(args.collaboratorRowId);
  },
});

// ── Recipient-side: invite preview + accept ──────────────────────────────

/**
 * Public, sanitized preview of an invite. Safe to call before the recipient
 * has signed in — leaks only the owner's display name and the plan title so
 * the accept screen can render meaningful copy.
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query("planInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!inv) return null;

    const now = Date.now();
    const effectiveStatus =
      inv.status === "pending" && inv.expiresAt < now ? "expired" : inv.status;

    const owner = await ctx.db.get(inv.ownerUserId);
    const plan = await ctx.db.get(inv.planId);
    const onboarding = plan
      ? await ctx.db
          .query("onboardingData")
          .withIndex("by_user", (q) => q.eq("userId", inv.ownerUserId))
          .first()
      : null;

    return {
      status: effectiveStatus,
      role: inv.role,
      invitedEmail: inv.invitedEmail,
      message: inv.message ?? null,
      ownerName: owner?.name ?? null,
      // Deliberately no ownerEmail: a forwarded/leaked invite link should
      // not expose the owner's address pre-auth, and the accept screen
      // only renders the display name.
      planId: inv.planId,
      roleTitle: onboarding?.roleTitle ?? null,
      companyName: onboarding?.companyName ?? null,
      expiresAt: inv.expiresAt,
    };
  },
});

export const acceptInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Sign in to accept this invitation");

    const inv = await ctx.db
      .query("planInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!inv) throw new Error("Invitation not found");

    const now = Date.now();
    if (inv.status === "revoked") throw new Error("This invitation was revoked");
    if (inv.status === "accepted" && inv.acceptedByUserId !== userId) {
      throw new Error("This invitation has already been used");
    }
    if (inv.status === "pending" && inv.expiresAt < now) {
      await ctx.db.patch(inv._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    if (inv.ownerUserId === userId) {
      throw new Error("You can't accept an invite to your own plan");
    }

    // Enforce that the signed-in user's email matches the invited email.
    // Without this check, anyone who gets hold of a share-link token can
    // exchange it for a collaborator row — the token would effectively
    // act as a bearer credential for any account. We compare after the
    // same normalizeEmail pass used on invite creation so casing /
    // whitespace differences don't block a legitimate acceptance.
    const me = await ctx.db.get(userId);
    const myEmail = normalizeEmail(me?.email);
    if (!myEmail || myEmail !== inv.invitedEmail) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Idempotent: if the user already has a collaborator row, just return it.
    const existing = await ctx.db
      .query("planCollaborators")
      .withIndex("by_plan_collaborator", (q) =>
        q.eq("planId", inv.planId).eq("collaboratorUserId", userId)
      )
      .unique();

    if (existing) {
      if (inv.status !== "accepted") {
        await ctx.db.patch(inv._id, {
          status: "accepted",
          acceptedAt: now,
          acceptedByUserId: userId,
        });
      }
      return { planId: inv.planId, collaboratorRowId: existing._id };
    }

    // If this invite was previously accepted by the current user but no
    // collaborator row exists anymore, the owner has revoked access —
    // refuse the replay instead of silently recreating it. The primary
    // removeCollaborator path also revokes the invitation, but this
    // belt-and-suspenders check protects us from any other path that
    // deletes a collaborator row without touching the invitation.
    if (inv.status === "accepted") {
      throw new Error("This invitation has already been used");
    }

    const collaboratorRowId = await ctx.db.insert("planCollaborators", {
      planId: inv.planId,
      ownerUserId: inv.ownerUserId,
      collaboratorUserId: userId,
      collaboratorEmail: me?.email ?? inv.invitedEmail,
      role: inv.role,
      invitationId: inv._id,
      acceptedAt: now,
    });

    await ctx.db.patch(inv._id, {
      status: "accepted",
      acceptedAt: now,
      acceptedByUserId: userId,
    });

    // Manager-only accounts shouldn't be forced through the personal
    // onboarding flow when they next visit /dashboard. Mark them complete
    // so the (app) layout doesn't bounce them out of the shared workspace.
    // They can still be re-onboarded via /onboarding directly if they
    // later decide to use Arcora for their own plan.
    if (me && !me.onboardingComplete) {
      await ctx.db.patch(userId, { onboardingComplete: true });
    }

    return { planId: inv.planId, collaboratorRowId };
  },
});

// ── Collaborator-side: list plans shared with me ─────────────────────────

export const listSharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query("planCollaborators")
      .withIndex("by_collaborator", (q) => q.eq("collaboratorUserId", userId))
      .collect();

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const owner = await ctx.db.get(row.ownerUserId);
        const onboarding = await ctx.db
          .query("onboardingData")
          .withIndex("by_user", (q) => q.eq("userId", row.ownerUserId))
          .first();
        return {
          _id: row._id,
          planId: row.planId,
          role: row.role,
          acceptedAt: row.acceptedAt,
          ownerName: owner?.name ?? null,
          ownerEmail: owner?.email ?? null,
          roleTitle: onboarding?.roleTitle ?? null,
          companyName: onboarding?.companyName ?? null,
        };
      })
    );

    return enriched.sort((a, b) => b.acceptedAt - a.acceptedAt);
  },
});

// ── Local helpers ────────────────────────────────────────────────────────

/**
 * Same as assertPlanOwner but returns null instead of throwing — useful for
 * queries that want to render an empty state on first paint while the auth
 * cookie hasn't propagated yet.
 */
async function assertPlanOwnerSafe(ctx, planId) {
  const userId = await auth.getUserId(ctx);
  if (!userId) return null;
  const plan = await ctx.db.get(planId);
  if (!plan) return null;
  if (plan.userId !== userId) return null;
  return { userId, plan };
}
