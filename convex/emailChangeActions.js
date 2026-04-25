"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";
import { renderEmailShell, renderCodeBlock, BRAND } from "./lib/emailLayout";

const FROM_ADDRESS = process.env.AUTH_EMAIL ?? "First90 <hello@switchtoux.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.first90days.com";
const PRODUCT_NAME = process.env.PRODUCT_NAME ?? "First90";
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? "";

function buildEmailChangeHtml(code) {
  const inner = `
<h1 style="margin:0 0 8px;font-family:${BRAND.font};font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">Confirm your new email</h1>
<p style="margin:0 0 8px;font-family:${BRAND.font};font-size:15px;line-height:1.6;color:${BRAND.inkSoft};">Enter this 8-digit code in your account settings to finish changing your email address:</p>
${renderCodeBlock(code)}
<p style="margin:0 0 8px;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">This code expires in 20 minutes.</p>
<p style="margin:0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.muted};">If you didn't request an email change, you can safely ignore this email — your account stays unchanged.</p>`;
  return renderEmailShell({
    preheader: `Confirm your new ${PRODUCT_NAME} email`,
    appUrl: APP_URL,
    productName: PRODUCT_NAME,
    logoUrl: LOGO_URL,
    innerHtml: inner,
    showManageNotifications: false,
  });
}

export const sendVerificationEmail = internalAction({
  args: { email: v.string(), code: v.string() },
  handler: async (_ctx, { email, code }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV !== "development") {
        throw new Error("AUTH_RESEND_KEY is not configured.");
      }
      console.warn(
        `[emailChange] AUTH_RESEND_KEY not set; skipping email change verification in development for ${email}`
      );
      return;
    }
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [email],
      subject: `Confirm your new ${PRODUCT_NAME} email`,
      html: buildEmailChangeHtml(code),
      text: [
        `Your ${PRODUCT_NAME} email change verification code is: ${code}`,
        "",
        "Enter this code in your account settings to confirm the email change. It expires in 20 minutes.",
        "",
        "If you didn't request this change, you can safely ignore this email.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(`Could not send verification email: ${error.message}`);
    }
  },
});
