import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";

// Email verification provider for @convex-dev/auth's Password provider.
// Emits an 8-digit numeric code (20-minute expiry, set by convex-auth).
// Delivery goes through Resend when AUTH_RESEND_KEY is set; otherwise
// the code is logged so local dev without a Resend account can still
// complete the flow by copying the code from the server log.

const FROM_ADDRESS = process.env.AUTH_EMAIL ?? "First90 <onboarding@resend.dev>";

function generateNumericCode(length = 8) {
  const digits = new Uint32Array(length);
  crypto.getRandomValues(digits);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += (digits[i] % 10).toString();
  }
  return out;
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
      subject: "Your First90 verification code",
      text: [
        `Your First90 verification code is: ${token}`,
        "",
        "This code expires in 20 minutes. If you didn't request it, you can ignore this email.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(`Could not send verification email: ${error.message}`);
    }
  },
});
