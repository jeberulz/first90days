import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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
    return { ...user, isPilotUser: isPilotEmail(user.email) };
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
