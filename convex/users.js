import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";
import { isPilotEmail } from "./lib/pilotUser";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { ...user, isPilotUser: isPilotEmail(user.email) };
  },
});

export const getDayNumber = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!onboarding) return null;

    const start = new Date(onboarding.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - start.getTime();
    const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    const phase =
      dayNumber <= 30 ? 1 : dayNumber <= 60 ? 2 : dayNumber <= 90 ? 3 : 3;
    const phaseName =
      phase === 1 ? "Learn" : phase === 2 ? "Contribute" : "Lead";

    return {
      dayNumber: Math.min(Math.max(dayNumber, 1), 90),
      totalDays: 90,
      phase,
      phaseName,
      startDate: onboarding.startDate,
      weekNumber: Math.min(Math.ceil(dayNumber / 7), 12),
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
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { settings: args.settings });
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
