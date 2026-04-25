import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Atomically checks whether a notification with this dedupKey has already been
// sent. If not, inserts a log row and returns true (caller should proceed to
// send). Returns false if the notification was already sent.
export const checkAndReserve = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    dedupKey: v.string(),
  },
  handler: async (ctx, { userId, type, dedupKey }) => {
    const existing = await ctx.db
      .query("notificationLog")
      .withIndex("by_dedup_key", (q) => q.eq("dedupKey", dedupKey))
      .first();
    if (existing) return false;
    await ctx.db.insert("notificationLog", { userId, type, dedupKey, sentAt: Date.now() });
    return true;
  },
});

// Returns up to 500 users whose daily reminder time falls within the given UTC
// hour and who have email notifications enabled. Filtered in JS because
// settings is a nested object (not indexable in Convex).
export const getUsersForDailyReminder = internalQuery({
  args: { currentHourUTC: v.number() },
  handler: async (ctx, { currentHourUTC }) => {
    const hourStr = String(currentHourUTC).padStart(2, "0");
    const users = await ctx.db.query("users").take(500);
    return users
      .filter((u) => {
        if (!u.email) return false;
        if (!u.settings?.emailNotifications) return false;
        if (!u.settings?.dailyReminderTime) return false;
        const [h] = u.settings.dailyReminderTime.split(":");
        return h === hourStr;
      })
      .map((u) => ({ _id: u._id, email: u.email, firstName: u.firstName, name: u.name }));
  },
});

// Returns up to 500 users eligible for a weekly reflection prompt.
// Runs daily — the action checks whether today is actually a week boundary.
export const getUsersForWeeklyReminder = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(500);
    return users
      .filter((u) => {
        if (!u.email) return false;
        if (!u.settings?.emailNotifications) return false;
        return u.settings?.milestoneReminders !== false;
      })
      .map((u) => ({ _id: u._id, email: u.email, firstName: u.firstName, name: u.name }));
  },
});

// Returns count + first 3 titles of upcoming activities scheduled for date.
export const getActivitiesToday = internalQuery({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("scheduledDate", date))
      .take(20);
    const upcoming = activities.filter((a) => a.status === "upcoming");
    return {
      count: upcoming.length,
      titles: upcoming.slice(0, 3).map((a) => a.title),
    };
  },
});

// Returns data needed to send a goal approval request email to the plan's managers.
export const getGoalApprovalEmailData = internalQuery({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) return null;

    const owner = await ctx.db.get(goal.userId);
    if (!owner?.email) return null;

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", goal.userId))
      .first();
    if (!plan) return null;

    const managers = await ctx.db
      .query("planCollaborators")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .take(20);

    const managerUsers = await Promise.all(
      managers
        .filter((m) => m.role === "manager")
        .map(async (m) => {
          const u = await ctx.db.get(m.collaboratorUserId);
          return u?.email
            ? { userId: m.collaboratorUserId, email: u.email, name: u.name ?? u.firstName ?? "Manager" }
            : null;
        })
    );

    return {
      goalId,
      goalTitle: goal.title,
      ownerUserId: goal.userId,
      ownerName: owner.name ?? owner.firstName ?? "Your team member",
      ownerEmail: owner.email,
      planId: plan._id,
      managers: managerUsers.filter(Boolean),
    };
  },
});

// Returns data needed to send a goal decision notification (approved / changes_requested) to the plan owner.
export const getGoalDecisionEmailData = internalQuery({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const goal = await ctx.db.get(goalId);
    if (!goal) return null;

    const owner = await ctx.db.get(goal.userId);
    if (!owner?.email) return null;

    const decider = goal.approvalDecidedByUserId
      ? await ctx.db.get(goal.approvalDecidedByUserId)
      : null;

    return {
      goalId,
      goalTitle: goal.title,
      approvalStatus: goal.approvalStatus,
      approvalNote: goal.approvalNote ?? null,
      ownerUserId: goal.userId,
      ownerEmail: owner.email,
      ownerName: owner.name ?? owner.firstName ?? "there",
      deciderName: decider?.name ?? decider?.firstName ?? "Your manager",
    };
  },
});

// Returns data needed to send a manager invite email.
export const getInvitationEmailData = internalQuery({
  args: { invitationId: v.id("planInvitations") },
  handler: async (ctx, { invitationId }) => {
    const inv = await ctx.db.get(invitationId);
    if (!inv) return null;

    const owner = await ctx.db.get(inv.ownerUserId);
    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", inv.ownerUserId))
      .first();

    return {
      ownerUserId: inv.ownerUserId,
      invitedEmail: inv.invitedEmail,
      token: inv.token,
      role: inv.role,
      message: inv.message ?? null,
      ownerName: owner?.name ?? owner?.firstName ?? "Someone",
      roleTitle: onboarding?.roleTitle ?? null,
      companyName: onboarding?.companyName ?? null,
    };
  },
});

// Returns data needed to send a plan comment notification.
export const getCommentEmailData = internalQuery({
  args: { commentId: v.id("planComments") },
  handler: async (ctx, { commentId }) => {
    const comment = await ctx.db.get(commentId);
    if (!comment) return null;

    const plan = await ctx.db.get(comment.planId);
    if (!plan) return null;

    const author = await ctx.db.get(comment.authorUserId);

    // Determine recipient: manager/viewer comments go to owner; owner comments
    // go to all managers.
    if (comment.authorRole !== "owner") {
      const owner = await ctx.db.get(plan.userId);
      if (!owner?.email) return null;
      return {
        recipients: [{ userId: plan.userId, email: owner.email, name: owner.name ?? owner.firstName ?? "there" }],
        authorName: author?.name ?? author?.firstName ?? "Your manager",
        body: comment.body,
        targetType: comment.targetType,
        planId: comment.planId,
      };
    }

    // Owner commented — notify all managers.
    const managers = await ctx.db
      .query("planCollaborators")
      .withIndex("by_plan", (q) => q.eq("planId", comment.planId))
      .take(20);

    const recipients = await Promise.all(
      managers
        .filter((m) => m.role === "manager")
        .map(async (m) => {
          const u = await ctx.db.get(m.collaboratorUserId);
          return u?.email
            ? { userId: m.collaboratorUserId, email: u.email, name: u.name ?? u.firstName ?? "Manager" }
            : null;
        })
    );

    return {
      recipients: recipients.filter(Boolean),
      authorName: author?.name ?? author?.firstName ?? "Your team member",
      body: comment.body,
      targetType: comment.targetType,
      planId: comment.planId,
    };
  },
});

// Returns user data + plan info needed for the welcome email.
export const getWelcomeEmailData = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user?.email) return null;

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Get week 1 activities as a preview.
    const week1Activities = plan
      ? await ctx.db
          .query("activities")
          .withIndex("by_user_week", (q) => q.eq("userId", userId).eq("weekNumber", 1))
          .take(3)
      : [];

    return {
      email: user.email,
      firstName: user.firstName ?? user.name?.split(" ")[0] ?? "there",
      roleTitle: onboarding?.roleTitle ?? null,
      companyName: onboarding?.companyName ?? null,
      week1Previews: week1Activities.map((a) => a.title),
    };
  },
});

// Returns user + plan week data needed for the weekly reflection email.
export const getWeeklyReflectionEmailData = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user?.email) return null;

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!onboarding?.startDate) return null;

    // Compute current week number from start date.
    const startMs = new Date(onboarding.startDate).getTime();
    const nowMs = Date.now();
    const daysSinceStart = Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24));
    if (daysSinceStart < 0 || daysSinceStart >= 90) return null;
    const weekNumber = Math.floor(daysSinceStart / 7) + 1;
    if (weekNumber < 1 || weekNumber > 12) return null;

    // Check whether they've already submitted this week's review.
    const existingReview = await ctx.db
      .query("weeklyReviews")
      .withIndex("by_user_week", (q) => q.eq("userId", userId).eq("weekNumber", weekNumber))
      .first();
    if (existingReview) return null;

    return {
      email: user.email,
      firstName: user.firstName ?? user.name?.split(" ")[0] ?? "there",
      weekNumber,
    };
  },
});
