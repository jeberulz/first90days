import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * One-shot cleanup. Before the reschedule-mutation fix, rescheduling a task
 * also flipped its status to "rescheduled" — which no view filters on, so
 * the task vanished from Today's Plan and the Tasks "Upcoming" tab.
 *
 * Resets every activity stuck on `status: "rescheduled"` back to `"upcoming"`.
 * The reschedule UI gates on !isDone && !isSkipped, so any such rows were
 * upcoming before being rescheduled — restoring that is the correct intent.
 *
 *   # Preview without writing:
 *   npx convex run migrations/clearRescheduledStatus:clearRescheduledStatus '{"dryRun": true}'
 *
 *   # Apply:
 *   npx convex run migrations/clearRescheduledStatus:clearRescheduledStatus '{}'
 *
 * Idempotent: re-runs with zero matches return cleanly.
 */
export const clearRescheduledStatus = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const preview = dryRun ?? false;

    const stuck = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("status"), "rescheduled"))
      .collect();

    if (!preview) {
      for (const activity of stuck) {
        await ctx.db.patch(activity._id, { status: "upcoming" });
      }
    }

    return {
      matched: stuck.length,
      updated: preview ? 0 : stuck.length,
      dryRun: preview,
    };
  },
});
