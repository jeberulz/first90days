import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { renderEmailShell, renderCodeBlock, BRAND } from "./lib/emailLayout";

// Email verification provider for @convex-dev/auth's Password provider.
// Emits an 8-digit numeric code (20-minute expiry, set by convex-auth).
// Delivery goes through Resend when AUTH_RESEND_KEY is set; otherwise
// the code is logged so local dev without a Resend account can still
// complete the flow by copying the code from the server log.

const FROM_ADDRESS = process.env.AUTH_EMAIL ?? "Arcora <hello@switchtoux.com>";
// Default to the root marketing/app domain. We're not running a separate
// app subdomain (app.usearcora.com is intentionally unconfigured), so a
// fallback to that subdomain produced 404s on every email CTA when the
// NEXT_PUBLIC_APP_URL env wasn't set on Convex prod.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://usearcora.com";
const PRODUCT_NAME = process.env.PRODUCT_NAME ?? "Arcora";
const LOGO_URL = process.env.EMAIL_LOGO_URL ?? `${APP_URL}/email-logo.png`;

function generateNumericCode(length = 8) {
  const digits = new Uint32Array(length);
  crypto.getRandomValues(digits);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += (digits[i] % 10).toString();
  }
  return out;
}

function buildVerificationHtml(code) {
  const inner = `
<h1 style="margin:0 0 8px;font-family:${BRAND.font};font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">Confirm your email</h1>
<p style="margin:0 0 8px;font-family:${BRAND.font};font-size:15px;line-height:1.6;color:${BRAND.inkSoft};">Enter this 8-digit code to finish signing in:</p>
${renderCodeBlock(code)}
<p style="margin:0 0 8px;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">This code expires in 20 minutes.</p>
<p style="margin:0;font-family:${BRAND.font};font-size:14px;line-height:1.6;color:${BRAND.muted};">If you didn't request this, you can safely ignore this email — no account will be created.</p>`;
  return renderEmailShell({
    preheader: `Your ${PRODUCT_NAME} verification code`,
    appUrl: APP_URL,
    productName: PRODUCT_NAME,
    logoUrl: LOGO_URL,
    innerHtml: inner,
    showManageNotifications: false,
  });
}

export const ResendOTP = Resend({
  id: "resend-otp",
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
        `[ResendOTP] AUTH_RESEND_KEY not set; skipping verification email in development for ${email}`
      );
      return;
    }
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [email],
      subject: `Your ${PRODUCT_NAME} verification code`,
      html: buildVerificationHtml(token),
      text: [
        `Your ${PRODUCT_NAME} verification code is: ${token}`,
        "",
        "Enter this code to finish signing in. It expires in 20 minutes.",
        "",
        "If you didn't request this, you can safely ignore this email.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(`Could not send verification email: ${error.message}`);
    }
  },
});
