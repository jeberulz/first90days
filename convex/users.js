import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { isPilotEmail, PILOT_PLAN_START_DATE } from "./lib/pilotUser";
import { computePlanDayInfo } from "./lib/planDates";
import { computeEntitlements } from "./billing";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    let imageUrl = null;
    if (user.image) {
      if (user.image.startsWith("http://") || user.image.startsWith("https://")) {
        imageUrl = user.image;
      } else {
        try {
          imageUrl = await ctx.storage.getUrl(user.image);
        } catch {
          imageUrl = null;
        }
      }
    }

    const entitlements = await computeEntitlements(ctx, userId);

    return {
      ...user,
      imageUrl,
      isPilotUser: isPilotEmail(user.email),
      tier: entitlements?.tier ?? "free",
      isPro: entitlements?.isPro ?? false,
      trialEndsAt: entitlements?.trialEndsAt ?? null,
      trialDaysLeft: entitlements?.trialDaysLeft ?? 0,
      cancelAtPeriodEnd: entitlements?.cancelAtPeriodEnd ?? false,
    };
  },
});

export const getDayNumber = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!onboarding) return null;

    // Pilot read-path override: canonical anchor wins even if DB row is stale.
    const info = computePlanDayInfo({
      user,
      onboarding,
      isPilot: isPilotEmail(user.email),
      pilotStartYmd: PILOT_PLAN_START_DATE,
    });
    if (!info) return null;

    // Public shape — keep the original field set for backwards compat.
    return {
      dayNumber: info.dayNumber,
      daysUntilStart: info.daysUntilStart,
      hasStarted: info.hasStarted,
      totalDays: info.totalDays,
      phase: info.phase,
      phaseName: info.phaseName,
      startDate: info.startDate,
      weekNumber: info.weekNumber,
    };
  },
});

export const updateSettings = mutation({
  args: {
    settings: v.object({
      timezone: v.optional(v.string()),
      dailyReminderTime: v.optional(v.string()),
      reflectionReminderTime: v.optional(v.string()),
      weekStartDay: v.optional(v.string()),
      emailNotifications: v.optional(v.boolean()),
      pushNotifications: v.optional(v.boolean()),
      dailyDigest: v.optional(v.boolean()),
      stakeholderUpdates: v.optional(v.boolean()),
      milestoneReminders: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(userId);
    const merged = { ...(existing?.settings ?? {}), ...args.settings };
    await ctx.db.patch(userId, { settings: merged });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.name !== undefined) {
      await ctx.db.patch(userId, { name: args.name });
    }

    if (args.roleTitle !== undefined) {
      const onboarding = await ctx.db
        .query("onboardingData")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (onboarding) {
        await ctx.db.patch(onboarding._id, { roleTitle: args.roleTitle });
      }
    }
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId);
    const prev = existing?.image;
    if (prev && !prev.startsWith("http")) {
      try {
        await ctx.storage.delete(prev);
      } catch {
        // ignore cleanup failure
      }
    }

    await ctx.db.patch(userId, { image: args.storageId });
  },
});

export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId);
    const prev = existing?.image;
    if (prev && !prev.startsWith("http")) {
      try {
        await ctx.storage.delete(prev);
      } catch {
        // ignore
      }
    }

    await ctx.db.patch(userId, { image: undefined });
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { onboardingComplete: true });
  },
});

// "plans" is intentionally NOT in this list — we defer deleting plan
// rows until every plan comment has been swept (which can span multiple
// batches). Otherwise later retries re-snapshot an empty ownedPlans and
// orphan collaborator-authored comments on the purged plans. The final
// pass deletes plan rows by hand before the user row.
const USER_OWNED_TABLES = [
  "activities",
  "goals",
  "stakeholders",
  "interactions",
  "dailyReflections",
  "weeklyReviews",
  "logEntries",
  "knowledgeEntries",
  "kbDocuments",
  "kbMemories",
  "kbSources",
  "kbEnrichmentJobs",
  "weeks",
  "phases",
  "onboardingData",
  "billingSubscriptions",
];

/**
 * Public delete: schedules the Stripe-cancel action, which (on success)
 * schedules the batched purge. The mutation returns immediately and the
 * client should sign out. If the Stripe cancel fails with an unexpected
 * error, purgeUserData never runs and the user's data stays intact —
 * requiring support intervention rather than leaving a ghost subscription.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.scheduler.runAfter(
      0,
      internal.billingActions.cancelSubscriptionForUser,
      { userId }
    );
  },
});

const PURGE_BATCH_SIZE = 100;

/**
 * Internal batched purge: deletes up to PURGE_BATCH_SIZE docs from each
 * user-owned table per invocation. Re-schedules itself if any table still
 * has more rows, so a single call stays under Convex transaction limits.
 * Final pass cleans up the avatar blob and the user document.
 */
export const purgeUserData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    let moreWork = false;

    // Snapshot owned plan ids. Plan rows are NOT deleted in this
    // invocation — they survive until every plan comment has been
    // swept (see USER_OWNED_TABLES comment), so every retry re-queries
    // the same non-empty list and the comment sweep below always has
    // a planId to aim at.
    const ownedPlans = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const ownedPlanIds = ownedPlans.map((p) => p._id);

    for (const table of USER_OWNED_TABLES) {
      const docs = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(PURGE_BATCH_SIZE);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      if (docs.length === PURGE_BATCH_SIZE) {
        moreWork = true;
      }
    }

    // Comments authored by anyone on plans this user owned (including the
    // owner's own comments, which the by_author sweep also covers).
    for (const planId of ownedPlanIds) {
      const planComments = await ctx.db
        .query("planComments")
        .withIndex("by_plan", (q) => q.eq("planId", planId))
        .take(PURGE_BATCH_SIZE);
      for (const row of planComments) await ctx.db.delete(row._id);
      if (planComments.length === PURGE_BATCH_SIZE) moreWork = true;
    }

    // Collaboration tables: the user may be either a plan owner or a
    // collaborator on someone else's plan, and may have authored comments
    // on either their own or a shared plan. Walk each angle.
    const ownedInvites = await ctx.db
      .query("planInvitations")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of ownedInvites) await ctx.db.delete(row._id);
    if (ownedInvites.length === PURGE_BATCH_SIZE) moreWork = true;

    const ownedCollabRows = await ctx.db
      .query("planCollaborators")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of ownedCollabRows) await ctx.db.delete(row._id);
    if (ownedCollabRows.length === PURGE_BATCH_SIZE) moreWork = true;

    const memberships = await ctx.db
      .query("planCollaborators")
      .withIndex("by_collaborator", (q) => q.eq("collaboratorUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of memberships) await ctx.db.delete(row._id);
    if (memberships.length === PURGE_BATCH_SIZE) moreWork = true;

    const authoredComments = await ctx.db
      .query("planComments")
      .withIndex("by_author", (q) => q.eq("authorUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of authoredComments) await ctx.db.delete(row._id);
    if (authoredComments.length === PURGE_BATCH_SIZE) moreWork = true;

    if (moreWork) {
      await ctx.scheduler.runAfter(0, internal.users.purgeUserData, { userId });
      return;
    }

    // Final pass: all owned child rows + plan comments have been
    // swept across prior invocations. Drop the plan rows now before
    // the user row. Plan counts per user are tiny (1 typically), so
    // this stays well under the transaction limit without batching.
    for (const plan of ownedPlans) {
      await ctx.db.delete(plan._id);
    }

    const user = await ctx.db.get(userId);
    if (!user) return;

    if (user.image && !user.image.startsWith("http")) {
      try {
        await ctx.storage.delete(user.image);
      } catch {
        // ignore — best-effort cleanup
      }
    }

    await ctx.db.delete(userId);
  },
});
