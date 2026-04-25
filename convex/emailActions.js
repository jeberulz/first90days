"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Resend } from "resend";

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ??
  process.env.AUTH_EMAIL ??
  "First90 <hello@first90days.com>";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.first90days.com";

function getResend() {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("AUTH_RESEND_KEY is not configured.");
    }
    return null;
  }
  return new Resend(apiKey);
}

async function sendEmail(resend, { to, subject, html, text }) {
  if (!resend) {
    console.warn(`[emailActions] skipping email (no API key) to ${to}: ${subject}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM_ADDRESS, to: [to], subject, html, text });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── Welcome + plan ready ────────────────────────────────────────────────────

export const sendWelcomeEmail = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const data = await ctx.runQuery(internal.notifications.getWelcomeEmailData, { userId });
    if (!data) return;

    const dedupKey = `welcome:${userId}`;
    const ok = await ctx.runMutation(internal.notifications.checkAndReserve, {
      userId,
      type: "welcome",
      dedupKey,
    });
    if (!ok) return;

    const resend = getResend();
    const previewList =
      data.week1Previews.length > 0
        ? `<ul style="margin:12px 0;padding-left:20px;">${data.week1Previews.map((t) => `<li style="margin-bottom:6px;">${t}</li>`).join("")}</ul>`
        : "";
    const roleContext =
      data.roleTitle && data.companyName
        ? ` as <strong>${data.roleTitle}</strong> at <strong>${data.companyName}</strong>`
        : data.roleTitle
          ? ` as <strong>${data.roleTitle}</strong>`
          : "";

    const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin-bottom:4px;">Your 90-day plan is ready, ${data.firstName}! 🎉</h2>
  <p style="color:#555;margin-top:0;">Your personalised plan for starting${roleContext} has been built. Here's a sneak peek at week 1:</p>
  ${previewList}
  <p>Every morning you'll find your activities waiting on the Today page. Small, focused tasks — one day at a time.</p>
  <a href="${APP_URL}/today" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">Go to today's plan →</a>
  <p style="color:#888;font-size:13px;margin-top:24px;">You're receiving this because you just generated your First90 plan. <a href="${APP_URL}/settings" style="color:#888;">Manage notifications</a></p>
</div>`;

    const text = `Your 90-day plan is ready, ${data.firstName}!\n\nYour personalised plan has been built. Head to ${APP_URL}/today to see today's activities.\n\nManage notifications: ${APP_URL}/settings`;

    await sendEmail(resend, { to: data.email, subject: "Your 90-day plan is ready 🎉", html, text });
  },
});

// ── Daily activity reminder ────────────────────────────────────────────────

export const sendDailyReminderEmail = internalAction({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const user = await ctx.runQuery(internal.notifications.getWelcomeEmailData, { userId });
    if (!user) return;

    const activities = await ctx.runQuery(internal.notifications.getActivitiesToday, {
      userId,
      date,
    });
    if (activities.count === 0) return;

    const dedupKey = `daily_reminder:${userId}:${date}`;
    const ok = await ctx.runMutation(internal.notifications.checkAndReserve, {
      userId,
      type: "daily_reminder",
      dedupKey,
    });
    if (!ok) return;

    const resend = getResend();
    const activityList =
      activities.titles.length > 0
        ? `<ul style="margin:12px 0;padding-left:20px;">${activities.titles.map((t) => `<li style="margin-bottom:6px;">${t}</li>`).join("")}${activities.count > activities.titles.length ? `<li style="color:#888;">+ ${activities.count - activities.titles.length} more…</li>` : ""}</ul>`
        : "";

    const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin-bottom:4px;">Good morning, ${user.firstName}!</h2>
  <p style="color:#555;margin-top:0;">You have <strong>${activities.count} ${activities.count === 1 ? "activity" : "activities"}</strong> lined up for today:</p>
  ${activityList}
  <a href="${APP_URL}/today" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">Start your day →</a>
  <p style="color:#888;font-size:13px;margin-top:24px;"><a href="${APP_URL}/settings" style="color:#888;">Manage notifications</a></p>
</div>`;

    const text = `Good morning, ${user.firstName}!\n\nYou have ${activities.count} ${activities.count === 1 ? "activity" : "activities"} lined up for today.\n\nSee them at ${APP_URL}/today\n\nManage notifications: ${APP_URL}/settings`;

    await sendEmail(resend, {
      to: user.email,
      subject: `${activities.count} ${activities.count === 1 ? "activity" : "activities"} ready for today`,
      html,
      text,
    });
  },
});

// ── Weekly reflection prompt ───────────────────────────────────────────────

export const sendWeeklyReflectionEmail = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const data = await ctx.runQuery(internal.notifications.getWeeklyReflectionEmailData, {
      userId,
    });
    if (!data) return;

    const dedupKey = `weekly_reflection:${userId}:${data.weekNumber}`;
    const ok = await ctx.runMutation(internal.notifications.checkAndReserve, {
      userId,
      type: "weekly_reflection",
      dedupKey,
    });
    if (!ok) return;

    const resend = getResend();
    const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin-bottom:4px;">Week ${data.weekNumber} is almost done, ${data.firstName}</h2>
  <p style="color:#555;margin-top:0;">Take 5 minutes to reflect on your week. Weekly reviews are the best way to track what's working and course-correct before next week starts.</p>
  <a href="${APP_URL}/reflect/weekly" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">Write your week ${data.weekNumber} reflection →</a>
  <p style="color:#888;font-size:13px;margin-top:24px;"><a href="${APP_URL}/settings" style="color:#888;">Manage notifications</a></p>
</div>`;

    const text = `Week ${data.weekNumber} is almost done, ${data.firstName}.\n\nTake 5 minutes to reflect at ${APP_URL}/reflect/weekly\n\nManage notifications: ${APP_URL}/settings`;

    await sendEmail(resend, {
      to: data.email,
      subject: `Time to reflect on week ${data.weekNumber} ✍️`,
      html,
      text,
    });
  },
});

// ── Goal approval request (owner → manager) ────────────────────────────────

export const sendGoalApprovalRequestEmail = internalAction({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const data = await ctx.runQuery(internal.notifications.getGoalApprovalEmailData, { goalId });
    if (!data || data.managers.length === 0) return;

    const resend = getResend();
    for (const manager of data.managers) {
      const dedupKey = `goal_approval_request:${goalId}:${manager.email}`;
      const ok = await ctx.runMutation(internal.notifications.checkAndReserve, {
        userId: manager.userId,
        type: "goal_approval_request",
        dedupKey,
      });
      if (!ok) continue;

      const planUrl = `${APP_URL}/shared/${data.planId}`;
      const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin-bottom:4px;">Goal approval request from ${data.ownerName}</h2>
  <p style="color:#555;margin-top:0;"><strong>${data.ownerName}</strong> has requested your sign-off on the following goal:</p>
  <blockquote style="border-left:3px solid #2563eb;margin:12px 0;padding:8px 16px;background:#f0f4ff;border-radius:4px;font-size:15px;">${data.goalTitle}</blockquote>
  <a href="${planUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">Review &amp; sign off →</a>
</div>`;

      const text = `${data.ownerName} has requested your sign-off on a goal: "${data.goalTitle}"\n\nReview it at ${planUrl}`;

      await sendEmail(resend, {
        to: manager.email,
        subject: `${data.ownerName} wants your approval on a goal`,
        html,
        text,
      });
    }
  },
});

// ── Goal decision notification (manager → owner) ───────────────────────────

export const sendGoalDecisionEmail = internalAction({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const data = await ctx.runQuery(internal.notifications.getGoalDecisionEmailData, { goalId });
    if (!data) return;
    if (data.approvalStatus !== "approved" && data.approvalStatus !== "changes_requested") return;

    const dedupKey = `goal_decision:${goalId}:${data.approvalStatus}`;
    const ok = await ctx.runMutation(internal.notifications.checkAndReserve, {
      userId: data.ownerUserId,
      type: "goal_decision",
      dedupKey,
    });
    if (!ok) return;

    const resend = getResend();
    const isApproved = data.approvalStatus === "approved";
    const statusLabel = isApproved ? "approved ✅" : "sent back with changes requested";
    const planUrl = `${APP_URL}/today`;
    const noteHtml = data.approvalNote
      ? `<blockquote style="border-left:3px solid #e5e7eb;margin:12px 0;padding:8px 16px;background:#f9fafb;border-radius:4px;font-size:14px;color:#444;">${data.approvalNote}</blockquote>`
      : "";

    const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin-bottom:4px;">Your goal has been ${statusLabel}</h2>
  <p style="color:#555;margin-top:0;"><strong>${data.deciderName}</strong> has reviewed your goal:</p>
  <blockquote style="border-left:3px solid #2563eb;margin:12px 0;padding:8px 16px;background:#f0f4ff;border-radius:4px;font-size:15px;">${data.goalTitle}</blockquote>
  ${noteHtml}
  <a href="${planUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">View your goals →</a>
  <p style="color:#888;font-size:13px;margin-top:24px;"><a href="${APP_URL}/settings" style="color:#888;">Manage notifications</a></p>
</div>`;

    const text = `${data.deciderName} has ${isApproved ? "approved" : "sent back"} your goal: "${data.goalTitle}"${data.approvalNote ? `\n\nNote: ${data.approvalNote}` : ""}\n\nView your goals: ${planUrl}`;

    await sendEmail(resend, {
      to: data.ownerEmail,
      subject: isApproved
        ? `✅ Goal approved: "${data.goalTitle}"`
        : `Changes requested on: "${data.goalTitle}"`,
      html,
      text,
    });
  },
});

// ── Manager invite email ───────────────────────────────────────────────────

export const sendManagerInviteEmail = internalAction({
  args: { invitationId: v.id("planInvitations") },
  handler: async (ctx, { invitationId }) => {
    const data = await ctx.runQuery(internal.notifications.getInvitationEmailData, {
      invitationId,
    });
    if (!data) return;

    const dedupKey = `manager_invite:${invitationId}`;
    const ok = await ctx.runMutation(internal.notifications.checkAndReserve, {
      userId: data.ownerUserId,
      type: "manager_invite",
      dedupKey,
    });
    if (!ok) return;

    const resend = getResend();
    const inviteUrl = `${APP_URL}/invite/${data.token}`;
    const contextLine =
      data.roleTitle && data.companyName
        ? `${data.ownerName} is building their 90-day plan as <strong>${data.roleTitle}</strong> at <strong>${data.companyName}</strong> and has invited you to collaborate as their ${data.role}.`
        : `${data.ownerName} has invited you to collaborate on their 90-day onboarding plan as their ${data.role}.`;

    const messageBlock = data.message
      ? `<blockquote style="border-left:3px solid #e5e7eb;margin:12px 0;padding:8px 16px;background:#f9fafb;border-radius:4px;font-size:14px;color:#444;">${data.message}</blockquote>`
      : "";

    const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin-bottom:4px;">${data.ownerName} invited you to their 90-day plan</h2>
  <p style="color:#555;margin-top:0;">${contextLine}</p>
  ${messageBlock}
  <p>As their ${data.role}, you can view their plan, leave comments, and sign off on goals.</p>
  <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">Accept invitation →</a>
  <p style="color:#888;font-size:13px;margin-top:24px;">This invitation expires in 14 days.</p>
</div>`;

    const text = `${data.ownerName} has invited you to their 90-day onboarding plan as their ${data.role}.\n\nAccept the invitation: ${inviteUrl}\n\nThis invitation expires in 14 days.`;

    await sendEmail(resend, {
      to: data.invitedEmail,
      subject: `${data.ownerName} invited you to their 90-day plan`,
      html,
      text,
    });
  },
});

// ── Plan comment notification ──────────────────────────────────────────────

export const sendPlanCommentEmail = internalAction({
  args: { commentId: v.id("planComments") },
  handler: async (ctx, { commentId }) => {
    const data = await ctx.runQuery(internal.notifications.getCommentEmailData, { commentId });
    if (!data || data.recipients.length === 0) return;

    const resend = getResend();
    for (const recipient of data.recipients) {
      const dedupKey = `plan_comment:${commentId}:${recipient.email}`;
      const ok = await ctx.runMutation(internal.notifications.checkAndReserve, {
        userId: recipient.userId,
        type: "plan_comment",
        dedupKey,
      });
      if (!ok) continue;

      const planUrl = `${APP_URL}/dashboard`;
      const targetLabel = data.targetType === "plan" ? "the plan" : `a ${data.targetType}`;
      const preview =
        data.body.length > 120 ? data.body.slice(0, 120).trimEnd() + "…" : data.body;

      const html = `
<div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin-bottom:4px;">New comment from ${data.authorName}</h2>
  <p style="color:#555;margin-top:0;"><strong>${data.authorName}</strong> left a comment on ${targetLabel}:</p>
  <blockquote style="border-left:3px solid #2563eb;margin:12px 0;padding:8px 16px;background:#f0f4ff;border-radius:4px;font-size:15px;">${preview}</blockquote>
  <a href="${planUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0;">View comment →</a>
  <p style="color:#888;font-size:13px;margin-top:24px;"><a href="${APP_URL}/settings" style="color:#888;">Manage notifications</a></p>
</div>`;

      const text = `${data.authorName} commented on ${targetLabel}:\n\n"${preview}"\n\nView it at ${planUrl}\n\nManage notifications: ${APP_URL}/settings`;

      await sendEmail(resend, {
        to: recipient.email,
        subject: `${data.authorName} commented on your plan`,
        html,
        text,
      });
    }
  },
});
