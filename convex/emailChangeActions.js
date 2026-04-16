"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

const FROM_ADDRESS = process.env.AUTH_EMAIL ?? "First90 <onboarding@resend.dev>";

export const sendVerificationEmail = internalAction({
  args: { email: v.string(), code: v.string() },
  handler: async (_ctx, { email, code }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.warn(
        `[emailChange] AUTH_RESEND_KEY not set — email to ${email} would contain code ${code}`
      );
      return;
    }
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [email],
      subject: "Confirm your new email address",
      text: [
        `Your First90 email change verification code is: ${code}`,
        "",
        "Enter this code in your settings to confirm the email change.",
        "This code expires in 20 minutes. If you didn't request this change, you can safely ignore this email.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(`Could not send verification email: ${error.message}`);
    }
  },
});
