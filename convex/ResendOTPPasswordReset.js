import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { renderEmailShell, renderCodeBlock, BRAND } from "./lib/emailLayout";

// Password-reset OTP provider for @convex-dev/auth's Password provider.
// Convex Auth calls this on `flow: "reset"` to deliver a one-time code
// that the user then submits with their new password via
// `flow: "reset-verification"`.

const FROM_ADDRESS = process.env.AUTH_EMAIL ?? "Arcora <hello@switchtoux.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.usearcora.com";
const PRODUCT_NAME = process.env.PRODUCT_NAME ?? "Arcora";
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? "";

function generateNumericCode(length = 8) {
  const digits = new Uint32Array(length);
  crypto.getRandomValues(digits);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += (digits[i] % 10).toString();
  }
  return out;
}

function buildResetHtml(code) {
  const inner = `
<h1 style="margin:0 0 8px;font-family:${BRAND.font};font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">Reset your password</h1>
<p style="margin:0 0 8px;font-family:${BRAND.font};font-size:15px;line-height:1.6;color:${BRAND.inkSoft};">Use this 8-digit code in the password reset form, along with your new password:</p>
${renderCodeBlock(code)}
<p style="margin:0 0 8px;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">This code expires in 20 minutes.</p>
<p style="margin:0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.muted};">If you didn't request a password reset, you can safely ignore this email — your current password will continue to work.</p>`;
  return renderEmailShell({
    preheader: `Your ${PRODUCT_NAME} password reset code`,
    appUrl: APP_URL,
    productName: PRODUCT_NAME,
    logoUrl: LOGO_URL,
    innerHtml: inner,
    showManageNotifications: false,
  });
}

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 20 * 60,
  async generateVerificationToken() {
    return generateNumericCode(8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      if (process.env.NODE_ENV !== "development") {
        throw new Error("AUTH_RESEND_KEY is not configured.");
      }
      console.warn(
        `[ResendOTPPasswordReset] AUTH_RESEND_KEY not set; skipping reset email in development for ${email}`
      );
      return;
    }
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [email],
      subject: `Reset your ${PRODUCT_NAME} password`,
      html: buildResetHtml(token),
      text: [
        `Your ${PRODUCT_NAME} password reset code is: ${token}`,
        "",
        "Enter this code in the password reset form along with your new password. The code expires in 20 minutes.",
        "",
        "If you didn't request a password reset, you can safely ignore this email — your current password will continue to work.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(`Could not send reset email: ${error.message}`);
    }
  },
});
