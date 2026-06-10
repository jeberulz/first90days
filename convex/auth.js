import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { ResendOTP } from "./ResendOTP";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

// Server-authoritative password policy. Mirrored client-side by
// src/lib/passwordValidation.js for real-time UI feedback. Keep the two
// lists in sync — the server decides, the client only reflects.
const PASSWORD_MIN_LENGTH = 10;

// Bump when the published Terms or Privacy Policy materially change. The
// stored version on the user row lets us detect users who agreed under an
// older revision and re-prompt for re-consent if needed.
export const TERMS_VERSION = "2026-05-02";
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "qwerty",
  "qwerty123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
  "monkey",
  "dragon",
]);

function validatePasswordRequirements(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    throw new ConvexError(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    );
  }
  if (!/[a-z]/.test(password)) {
    throw new ConvexError("Password must include a lowercase letter.");
  }
  if (!/[A-Z]/.test(password)) {
    throw new ConvexError("Password must include an uppercase letter.");
  }
  if (!/\d/.test(password)) {
    throw new ConvexError("Password must include a number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new ConvexError("Password must include a special character.");
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new ConvexError("This password is too common. Pick something harder to guess.");
  }
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // Server-authoritative brute-force protection (token bucket per account):
  // 5 failed credential attempts, then one more allowed every 12 minutes.
  // The login page mirrors this with a client-side lockout for UX only —
  // this setting is what actually enforces it.
  signIn: { maxFailedAttempsPerHour: 5 },
  providers: [
    Password({
      verify: ResendOTP,
      reset: ResendOTPPasswordReset,
      validatePasswordRequirements,
      profile(params) {
        const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
        if (!email || !email.includes("@")) {
          throw new ConvexError("A valid email address is required.");
        }
        if (
          typeof params.password === "string" &&
          params.password.toLowerCase() === email
        ) {
          throw new ConvexError("Password must be different from your email.");
        }

        const firstName =
          typeof params.firstName === "string" ? params.firstName.trim() : "";
        const lastName =
          typeof params.lastName === "string" ? params.lastName.trim() : "";
        const explicitName =
          typeof params.name === "string" ? params.name.trim() : "";
        const composedName = [firstName, lastName].filter(Boolean).join(" ");
        const name = composedName || explicitName || "";

        // UK GDPR Art 13/14 + consumer law: signup must record explicit
        // agreement to ToS + Privacy. Block if missing — the client form
        // also gates this, but the server is the source of truth.
        const flow = typeof params.flow === "string" ? params.flow : "";
        if (flow === "signUp") {
          if (params.acceptedTerms !== true && params.acceptedTerms !== "true") {
            throw new ConvexError(
              "You must accept the Terms and Privacy Policy to create an account."
            );
          }
        }

        const out = { email };
        if (firstName) out.firstName = firstName;
        if (lastName) out.lastName = lastName;
        if (name) out.name = name;
        if (flow === "signUp") {
          out.acceptedTermsAt = Date.now();
          out.acceptedTermsVersion = TERMS_VERSION;
          // UK PECR: marketing consent must be explicit + opt-in. Default
          // false; only stamp if the checkbox was actively ticked.
          const marketing =
            params.marketingConsent === true ||
            params.marketingConsent === "true";
          out.marketingConsent = marketing;
          if (marketing) out.marketingConsentAt = Date.now();
        }
        return out;
      },
    }),
  ],
});
