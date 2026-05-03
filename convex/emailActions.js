"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Resend } from "resend";
import {
  renderTemplate,
  renderQuote,
  renderNote,
  escapeHtml,
  BRAND,
} from "./lib/emailLayout";

// Sender + identity. AUTH_EMAIL is the canonical override for ALL outgoing
// mail (auth + lifecycle) and is the env var Convex auth's resend providers
// also read, so keeping a single source of truth across all email modules
// avoids the drift we had before (auth came from one address, lifecycle
// from another).
const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ??
  process.env.AUTH_EMAIL ??
  "Arcora <hello@switchtoux.com>";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.usearcora.com";
const PRODUCT_NAME = process.env.PRODUCT_NAME ?? "Arcora";
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? `${APP_URL}/email-logo.png`;

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

// Reusable building blocks scoped to lifecycle emails. Anything user-supplied
// (names, role titles, comment bodies, etc.) MUST flow through escapeHtml
// before being interpolated into the bodyHtml string.

function renderBulletList(items) {
  if (!items || items.length === 0) return "";
  const lis = items
    .map(
      (raw) =>
        `<li style="margin:0 0 8px;color:${BRAND.inkSoft};font-family:${BRAND.font};font-size:15px;line-height:1.5;">${escapeHtml(raw)}</li>`
    )
    .join("");
  return `<ul style="margin:14px 0;padding-left:20px;">${lis}</ul>`;
}

function renderParagraph(html, opts = {}) {
  const colour = opts.muted ? BRAND.inkSoft : BRAND.ink;
  return `<p style="margin:0 0 12px;font-family:${BRAND.font};font-size:15px;line-height:1.6;color:${colour};">${html}</p>`;
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
    const safeFirst = escapeHtml(data.firstName);
    const roleContext =
      data.roleTitle && data.companyName
        ? ` as <strong>${escapeHtml(data.roleTitle)}</strong> at <strong>${escapeHtml(data.companyName)}</strong>`
        : data.roleTitle
          ? ` as <strong>${escapeHtml(data.roleTitle)}</strong>`
          : "";

    const bodyHtml = `
${renderParagraph(`Your personalised plan for starting${roleContext} is ready. Here's a sneak peek at week 1:`, { muted: true })}
${renderBulletList(data.week1Previews)}
${renderParagraph("Every morning you'll find that day's activities waiting on the Today page. Small, focused tasks — one day at a time.", { muted: true })}`;

    const html = renderTemplate({
      preheader: "Your personalised 90-day plan is ready — here's a peek at week 1",
      appUrl: APP_URL,
      productName: PRODUCT_NAME,
      logoUrl: LOGO_URL,
      heading: `Your 90-day plan is ready, ${safeFirst}! 🎉`,
      bodyHtml,
      ctaHref: `${APP_URL}/today`,
      ctaLabel: "Go to today's plan →",
    });

    const text = `Your 90-day plan is ready, ${data.firstName}!\n\nYour personalised plan has been built. Head to ${APP_URL}/today to see today's activities.\n\nManage notifications: ${APP_URL}/settings`;

    await sendEmail(resend, {
      to: data.email,
      subject: `Your 90-day plan is ready 🎉`,
      html,
      text,
    });
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
    const safeFirst = escapeHtml(user.firstName);
    const more = activities.count - activities.titles.length;
    const titlesHtml = renderBulletList(activities.titles);
    const moreLine =
      more > 0
        ? `<p style="margin:0 0 12px;font-family:${BRAND.font};font-size:13px;color:${BRAND.muted};">+ ${more} more${more === 1 ? "" : ""} on Today.</p>`
        : "";
    const countLabel = activities.count === 1 ? "activity" : "activities";

    const bodyHtml = `
${renderParagraph(`You have <strong>${activities.count} ${countLabel}</strong> lined up for today:`, { muted: true })}
${titlesHtml}
${moreLine}`;

    const html = renderTemplate({
      preheader: `${activities.count} ${countLabel} ready for today`,
      appUrl: APP_URL,
      productName: PRODUCT_NAME,
      logoUrl: LOGO_URL,
      heading: `Good morning, ${safeFirst}`,
      bodyHtml,
      ctaHref: `${APP_URL}/today`,
      ctaLabel: "Start your day →",
    });

    const text = `Good morning, ${user.firstName}!\n\nYou have ${activities.count} ${countLabel} lined up for today.\n\nSee them at ${APP_URL}/today\n\nManage notifications: ${APP_URL}/settings`;

    await sendEmail(resend, {
      to: user.email,
      subject: `${activities.count} ${countLabel} ready for today`,
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
    const safeFirst = escapeHtml(data.firstName);

    const bodyHtml = `
${renderParagraph(`Week ${data.weekNumber} is almost done. Take 5 minutes to reflect on what worked, what didn't, and what to course-correct before next week starts.`, { muted: true })}
${renderParagraph("Weekly reviews are how the best onboarders stay on track — not by working harder, but by noticing patterns early.", { muted: true })}`;

    const html = renderTemplate({
      preheader: `Take 5 minutes to reflect on week ${data.weekNumber}`,
      appUrl: APP_URL,
      productName: PRODUCT_NAME,
      logoUrl: LOGO_URL,
      heading: `Week ${data.weekNumber} reflection time, ${safeFirst}`,
      bodyHtml,
      ctaHref: `${APP_URL}/reflect/weekly`,
      ctaLabel: `Write your week ${data.weekNumber} reflection →`,
    });

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
      const safeOwner = escapeHtml(data.ownerName);
      const safeGoal = escapeHtml(data.goalTitle);

      const bodyHtml = `
${renderParagraph(`<strong>${safeOwner}</strong> has requested your sign-off on the following goal:`, { muted: true })}
${renderQuote(safeGoal)}
${renderParagraph("As their reviewer, you can approve, request changes, or leave a comment when you visit the plan.", { muted: true })}`;

      const html = renderTemplate({
        preheader: `${data.ownerName} wants your sign-off on a 90-day goal`,
        appUrl: APP_URL,
        productName: PRODUCT_NAME,
        logoUrl: LOGO_URL,
        heading: `${data.ownerName} needs your approval`,
        bodyHtml,
        ctaHref: planUrl,
        ctaLabel: "Review &amp; sign off →",
      });

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
    const planUrl = `${APP_URL}/today`;
    const safeDecider = escapeHtml(data.deciderName);
    const safeGoal = escapeHtml(data.goalTitle);
    const safeNote = data.approvalNote ? escapeHtml(data.approvalNote) : "";
    const noteBlock = safeNote ? renderNote(safeNote) : "";

    const heading = isApproved
      ? `Your goal was approved ✅`
      : `Changes requested on your goal`;

    const bodyHtml = `
${renderParagraph(`<strong>${safeDecider}</strong> has reviewed your goal:`, { muted: true })}
${renderQuote(safeGoal)}
${noteBlock}`;

    const html = renderTemplate({
      preheader: isApproved
        ? `${data.deciderName} approved your goal`
        : `${data.deciderName} requested changes on your goal`,
      appUrl: APP_URL,
      productName: PRODUCT_NAME,
      logoUrl: LOGO_URL,
      heading,
      bodyHtml,
      ctaHref: planUrl,
      ctaLabel: "View your goals →",
    });

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
    const safeOwner = escapeHtml(data.ownerName);
    const safeRole = escapeHtml(data.role);
    const safeRoleTitle = data.roleTitle ? escapeHtml(data.roleTitle) : "";
    const safeCompany = data.companyName ? escapeHtml(data.companyName) : "";

    const contextLine =
      safeRoleTitle && safeCompany
        ? `${safeOwner} is building their 90-day plan as <strong>${safeRoleTitle}</strong> at <strong>${safeCompany}</strong> and has invited you to collaborate as their ${safeRole}.`
        : `${safeOwner} has invited you to collaborate on their 90-day onboarding plan as their ${safeRole}.`;

    const messageBlock = data.message ? renderNote(escapeHtml(data.message)) : "";

    const explainerHtml = `<div style="margin:18px 0;padding:14px 16px;background:${BRAND.bg};border:1px solid ${BRAND.cardBorder};border-radius:10px;font-family:${BRAND.font};font-size:13px;line-height:1.5;color:${BRAND.inkSoft};">
<strong style="color:${BRAND.ink};">What is ${escapeHtml(PRODUCT_NAME)}?</strong> A workspace that helps people starting a new role build a personalised 30/60/90 plan and stay aligned with their manager.
</div>`;

    const bodyHtml = `
${renderParagraph(contextLine, { muted: true })}
${messageBlock}
${renderParagraph(`As their ${safeRole}, you can review the plan, leave comments, and sign off on goals.`, { muted: true })}
${explainerHtml}`;

    const html = renderTemplate({
      preheader: `${data.ownerName} invited you to review their 90-day plan`,
      appUrl: APP_URL,
      productName: PRODUCT_NAME,
      logoUrl: LOGO_URL,
      heading: `${data.ownerName} invited you to their 90-day plan`,
      bodyHtml,
      ctaHref: inviteUrl,
      ctaLabel: "Accept invitation →",
      showManageNotifications: false,
      footerNote: "This invitation expires in 14 days.",
    });

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
      const safeAuthor = escapeHtml(data.authorName);
      const safePreview = escapeHtml(preview);

      const bodyHtml = `
${renderParagraph(`<strong>${safeAuthor}</strong> left a comment on ${escapeHtml(targetLabel)}:`, { muted: true })}
${renderQuote(safePreview)}`;

      const html = renderTemplate({
        preheader: `${data.authorName} commented: ${preview}`,
        appUrl: APP_URL,
        productName: PRODUCT_NAME,
        logoUrl: LOGO_URL,
        heading: `New comment from ${data.authorName}`,
        bodyHtml,
        ctaHref: planUrl,
        ctaLabel: "View comment →",
      });

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
