import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";
import { computePlanDayInfo, scheduleYmd } from "./lib/planDates";
import { isPilotEmail, PILOT_PLAN_START_DATE } from "./lib/pilotUser";

/**
 * Phase-completion celebration pipeline.
 *
 * When a user crosses a phase boundary (day 30 → Learn done, day 60 →
 * Contribute done, day 90 → plan complete) we want to mark the moment
 * with a one-time modal that:
 *   1. Acknowledges the phase transition,
 *   2. Shows a compact stat roll-up (activities done, wins, learnings),
 *   3. Points to the existing /reflect/phase/[n] deep-review page.
 *
 * State lives on phases.milestoneAcknowledgedAt — set once on dismissal,
 * never cleared. The query returns the first unacknowledged phase the
 * user has already passed, so a user who misses day 30 and logs in on
 * day 42 still gets their Learn celebration before seeing Contribute.
 */

const PHASE_NAMES = { 1: "Learn", 2: "Contribute", 3: "Lead" };

export const getPendingMilestone = query({
  args: {},
  handler: async (ctx) => {
    // This query drives a best-effort celebration modal — it must never
    // take down the app shell if it hits an unexpected row shape or a
    // legacy user without phases/activities. Any throw here bubbles up
    // through useQuery at render time and crashes (app)/layout.js, so
    // we catch everything and degrade to "no pending milestone".
    // Matches the defensive pattern from commit 700799a for brainStatus.
    try {
      const userId = await auth.getUserId(ctx);
      if (!userId) return null;

      const user = await ctx.db.get(userId);
      if (!user) return null;

      const onboarding = await ctx.db
        .query("onboardingData")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (!onboarding) return null;

      const info = computePlanDayInfo({
        user,
        onboarding,
        isPilot: isPilotEmail(user.email),
        pilotStartYmd: PILOT_PLAN_START_DATE,
      });
      if (!info || !info.hasStarted) return null;
      const dayNumber = info.dayNumber;
      const planStart = info.startDate;

      const phases = await ctx.db
        .query("phases")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      if (phases.length === 0) return null;

      // Sorted by phase number so Learn fires before Contribute, etc.
      const sorted = phases.slice().sort((a, b) => a.number - b.number);

      // First phase the user has passed (dayNumber > endDay) that hasn't
      // been acknowledged yet. We don't care if later phases exist — the
      // modal only shows one at a time.
      const pending = sorted.find(
        (p) => dayNumber > p.endDay && !p.milestoneAcknowledgedAt
      );
      if (!pending) return null;

      // Roll up the stats the modal will display. Filter activities by
      // weekNumber so we stay consistent with the existing /reflect/phase
      // page (4 weeks per phase, 12 total).
      const startWeek = (pending.number - 1) * 4 + 1;
      const endWeek = pending.number * 4;

      const activities = await ctx.db
        .query("activities")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const phaseActivities = activities.filter(
        (a) => a.weekNumber >= startWeek && a.weekNumber <= endWeek
      );
      const completedCount = phaseActivities.filter(
        (a) => a.status === "completed"
      ).length;
      const plannedCount = phaseActivities.length;

      // Wins + learnings logged during the phase. logEntries uses a
      // free-form `date` string (YYYY-MM-DD), so we can't index on it —
      // small client-side filter instead, bounded by the user's log
      // volume which is tiny in practice. Filter by the phase date
      // window so each celebration only counts entries from that phase.
      const phaseStartYmd = scheduleYmd(planStart, pending.startDay);
      const phaseEndYmd = scheduleYmd(planStart, pending.endDay);
      const logs = await ctx.db
        .query("logEntries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const inPhase = logs.filter(
        (l) =>
          typeof l.date === "string" &&
          l.date >= phaseStartYmd &&
          l.date <= phaseEndYmd
      );
      const winsCount = inPhase.filter((l) => l.type === "win").length;
      const learningsCount = inPhase.filter((l) => l.type === "learning").length;

      const goals = await ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const phaseGoals = goals.filter((g) => g.targetPhase === pending.number);
      const goalsCompleted = phaseGoals.filter(
        (g) => g.status === "completed"
      ).length;

      return {
        phaseId: pending._id,
        phaseNumber: pending.number,
        phaseName: PHASE_NAMES[pending.number] || pending.name,
        startDay: pending.startDay,
        endDay: pending.endDay,
        milestone: pending.milestone,
        dayNumber,
        isFinalPhase: pending.number === 3,
        stats: {
          activitiesCompleted: completedCount,
          activitiesPlanned: plannedCount,
          completionPct:
            plannedCount > 0
              ? Math.round((completedCount / plannedCount) * 100)
              : 0,
          winsCount,
          learningsCount,
          goalsCompleted,
          goalsTotal: phaseGoals.length,
        },
      };
    } catch (err) {
      // Log to Convex so we can inspect the real cause in the dashboard
      // once this is deployed. Returning null keeps the app shell alive.
      console.error("getPendingMilestone failed:", err);
      return null;
    }
  },
});

export const acknowledgeMilestone = mutation({
  args: { phaseId: v.id("phases") },
  handler: async (ctx, { phaseId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const phase = await ctx.db.get(phaseId);
    if (!phase) throw new Error("Phase not found");
    // Prevent one user acknowledging another user's milestone.
    if (phase.userId !== userId) throw new Error("Not authorized");
    // Idempotent: first acknowledgement wins, later calls are no-ops.
    if (phase.milestoneAcknowledgedAt) return phase.milestoneAcknowledgedAt;

    const ts = Date.now();
    await ctx.db.patch(phaseId, { milestoneAcknowledgedAt: ts });
    return ts;
  },
});
