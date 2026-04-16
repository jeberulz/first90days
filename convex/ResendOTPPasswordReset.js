import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";

// Password-reset OTP provider for @convex-dev/auth's Password provider.
// Convex Auth calls this on `flow: "reset"` to deliver a one-time code
// that the user then submits with their new password via
// `flow: "reset-verification"`.

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

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp-password-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 20 * 60,
  async generateVerificationToken() {
    return generateNumericCode(8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      console.warn(
        `[ResendOTPPasswordReset] AUTH_RESEND_KEY not set — reset code for ${email} is ${token}`
      );
      return;
    }
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [email],
      subject: "Reset your First90 password",
      text: [
        `Your First90 password reset code is: ${token}`,
        "",
        "Enter this code in the app along with your new password. The code expires in 20 minutes.",
        "",
        "If you didn't request a password reset, you can safely ignore this email — your current password will continue to work.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(`Could not send reset email: ${error.message}`);
    }
  },
});
