import { cronJobs } from "convex/server";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Fans out daily activity reminder emails to users whose dailyReminderTime
// matches the current UTC hour and who have email notifications enabled.
export const processDailyReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const nowUTC = new Date();
    const currentHourUTC = nowUTC.getUTCHours();
    const todayUTC = nowUTC.toISOString().split("T")[0];

    const users = await ctx.runQuery(internal.notifications.getUsersForDailyReminder, {
      currentHourUTC,
    });

    for (const user of users) {
      await ctx.scheduler.runAfter(0, internal.emailActions.sendDailyReminderEmail, {
        userId: user._id,
        date: todayUTC,
      });
    }
  },
});

// Fans out weekly reflection prompt emails. Runs daily at 17:00 UTC — each
// individual send checks whether today is a week boundary and the review
// hasn't been submitted yet, so it's safe to run broadly.
export const processWeeklyReflections = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.notifications.getUsersForWeeklyReminder, {});

    for (const user of users) {
      await ctx.scheduler.runAfter(0, internal.emailActions.sendWeeklyReflectionEmail, {
        userId: user._id,
      });
    }
  },
});

const crons = cronJobs();

// Run every hour to catch each user's configured daily reminder time.
crons.interval(
  "daily-activity-reminders",
  { hours: 1 },
  internal.crons.processDailyReminders,
  {}
);

// Run daily at 17:00 UTC — end-of-day prompt to reflect on the week.
// The individual send checks week boundaries, so only users at a week
// boundary who haven't submitted their review yet get the email.
crons.cron(
  "weekly-reflection-reminders",
  "0 17 * * *",
  internal.crons.processWeeklyReflections,
  {}
);

// Run daily at 02:00 UTC — reconcile prior-day whisperer invocations
// against their expected semantic classifier output. For every turn
// that produced no semantic row of any kind (label, completed_empty
// sentinel, or failed sentinel), emit semantic_classify_failed with
// recovered_by_reconciliation: true so the gap surfaces in analytics.
crons.cron(
  "reconcile-whisperer-semantic-events",
  "0 2 * * *",
  internal.whispererTelemetry.reconcileWhispererSemanticEvents,
  {}
);

export default crons;
