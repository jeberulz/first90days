import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { isPilotEmail, PILOT_PLAN_START_DATE } from "./lib/pilotUser";
import {
  resolveUserTimezone,
  tzTodayYmd,
  diffCalendarDays,
} from "./lib/planDates";

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

    return {
      ...user,
      imageUrl,
      isPilotUser: isPilotEmail(user.email),
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
    const isPilot = isPilotEmail(user.email);
    const effectiveStartYmd = isPilot
      ? PILOT_PLAN_START_DATE
      : onboarding.startDate;

    const tz = resolveUserTimezone(user);
    const todayYmd = tzTodayYmd(tz);
    const rawDay = diffCalendarDays(effectiveStartYmd, todayYmd) + 1;

    const hasStarted = rawDay >= 1;
    const daysUntilStart = hasStarted ? 0 : Math.abs(rawDay) + 1;

    if (!hasStarted) {
      return {
        dayNumber: 0,
        daysUntilStart,
        hasStarted: false,
        totalDays: 90,
        phase: 0,
        phaseName: "Pre-boarding",
        startDate: effectiveStartYmd,
        weekNumber: 0,
      };
    }

    const clamped = Math.min(rawDay, 90);
    const phase = clamped <= 30 ? 1 : clamped <= 60 ? 2 : 3;
    const phaseName =
      phase === 1 ? "Learn" : phase === 2 ? "Contribute" : "Lead";

    return {
      dayNumber: clamped,
      daysUntilStart: 0,
      hasStarted: true,
      totalDays: 90,
      phase,
      phaseName,
      startDate: effectiveStartYmd,
      weekNumber: Math.min(Math.ceil(clamped / 7), 12),
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
  "plans",
  "onboardingData",
];

/**
 * Public delete: schedules an internal batched purge and returns immediately.
 * The client should then sign out. The user document is deleted on the final
 * batch pass so subsequent re-sign-in starts a fresh user.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.scheduler.runAfter(0, internal.users.purgeUserData, { userId });
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

    if (moreWork) {
      await ctx.scheduler.runAfter(0, internal.users.purgeUserData, { userId });
      return;
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
