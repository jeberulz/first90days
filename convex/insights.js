import { query } from "./_generated/server";
import { auth } from "./auth";
import { isPilotEmail, PILOT_PLAN_START_DATE } from "./lib/pilotUser";
import { computePlanDayInfo } from "./lib/planDates";

/**
 * Velocity / pace insights for the Progress page.
 *
 * Compares what the plan scheduled to happen by today against what has
 * actually been completed. Skipped activities are excluded from the
 * denominator — the user intentionally took them off the table, so they
 * shouldn't drag the pace ratio down.
 *
 * Everything needed for the Progress page comes back in one round-trip:
 *   - hero: pace ratio + verdict
 *   - weekly burn-up (12 weeks)
 *   - category split
 *   - phase comparison (Learn / Contribute / Lead)
 *
 * Returns null when the user has no plan yet.
 */
export const getVelocity = query({
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

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) return null;

    const info = computePlanDayInfo({
      user,
      onboarding,
      isPilot: isPilotEmail(user.email),
      pilotStartYmd: PILOT_PLAN_START_DATE,
    });
    if (!info) return null;
    const { dayNumber, hasStarted } = info;

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();

    // ── Headline pace numbers ────────────────────────────────────────
    // scheduledByToday: non-skipped activities whose scheduledDay falls
    // on or before today. "should be done by now."
    // completedByToday: of those, how many are actually done.
    // On day 0 (pre-boarding) the denominator is 0 and we treat the
    // ratio as 1 (nothing due yet = on pace).
    let scheduledByToday = 0;
    let completedByToday = 0;
    for (const a of activities) {
      const day = a.scheduledDay ?? null;
      if (day === null) continue;
      if (a.status === "skipped") continue;
      if (day <= dayNumber) {
        scheduledByToday += 1;
        if (a.status === "completed") completedByToday += 1;
      }
    }

    const paceRatio =
      scheduledByToday === 0 ? 1 : completedByToday / scheduledByToday;

    // Verdict buckets — kept intentionally generous on the high side so
    // small early-week wins don't read as "ahead of the whole plan."
    let paceVerdict;
    if (!hasStarted) paceVerdict = "pre_boarding";
    else if (paceRatio >= 1) paceVerdict = "ahead";
    else if (paceRatio >= 0.85) paceVerdict = "on_pace";
    else if (paceRatio >= 0.6) paceVerdict = "slipping";
    else paceVerdict = "behind";

    // ── Weekly burn-up (12 weeks) ────────────────────────────────────
    const weekly = Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      planned: 0,
      completed: 0,
      skipped: 0,
      isPast: false,
      isCurrent: false,
      isFuture: false,
    }));
    const currentWeek = Math.min(Math.max(Math.ceil(dayNumber / 7), 1), 12);
    for (const a of activities) {
      const w = a.weekNumber;
      if (!w || w < 1 || w > 12) continue;
      const row = weekly[w - 1];
      row.planned += 1;
      if (a.status === "completed") row.completed += 1;
      else if (a.status === "skipped") row.skipped += 1;
    }
    for (const row of weekly) {
      if (!hasStarted) {
        row.isFuture = true;
      } else if (row.weekNumber < currentWeek) {
        row.isPast = true;
      } else if (row.weekNumber === currentWeek) {
        row.isCurrent = true;
      } else {
        row.isFuture = true;
      }
    }

    // ── Category split ───────────────────────────────────────────────
    // Group by category; each bucket carries planned / completed and a
    // completion pct the UI can render as a bar.
    const categoryMap = new Map();
    for (const a of activities) {
      const key = a.category || "other";
      let bucket = categoryMap.get(key);
      if (!bucket) {
        bucket = { category: key, planned: 0, completed: 0, skipped: 0 };
        categoryMap.set(key, bucket);
      }
      bucket.planned += 1;
      if (a.status === "completed") bucket.completed += 1;
      else if (a.status === "skipped") bucket.skipped += 1;
    }
    const categories = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        pct:
          c.planned - c.skipped > 0
            ? Math.round((c.completed / (c.planned - c.skipped)) * 100)
            : 0,
      }))
      .sort((a, b) => b.planned - a.planned);

    // ── Phase comparison (Learn / Contribute / Lead) ─────────────────
    const phases = [
      { number: 1, name: "Learn", startDay: 1, endDay: 30 },
      { number: 2, name: "Contribute", startDay: 31, endDay: 60 },
      { number: 3, name: "Lead", startDay: 61, endDay: 90 },
    ].map((p) => {
      let planned = 0;
      let completed = 0;
      let skipped = 0;
      for (const a of activities) {
        const day = a.scheduledDay ?? null;
        if (day === null) continue;
        if (day < p.startDay || day > p.endDay) continue;
        planned += 1;
        if (a.status === "completed") completed += 1;
        else if (a.status === "skipped") skipped += 1;
      }
      const active = planned - skipped;
      return {
        ...p,
        planned,
        completed,
        skipped,
        pct: active > 0 ? Math.round((completed / active) * 100) : 0,
        isCurrent: dayNumber >= p.startDay && dayNumber <= p.endDay,
        isPast: dayNumber > p.endDay,
      };
    });

    // ── Current week shortcut for the hero ───────────────────────────
    const currentWeekRow = weekly[currentWeek - 1] || {
      planned: 0,
      completed: 0,
    };

    return {
      hasStarted,
      dayNumber,
      totalDays: 90,
      scheduledByToday,
      completedByToday,
      paceRatio,
      paceVerdict,
      weekly,
      categories,
      phases,
      currentWeek,
      currentWeekPlanned: currentWeekRow.planned,
      currentWeekCompleted: currentWeekRow.completed,
    };
  },
});
