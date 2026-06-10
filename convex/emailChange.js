import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const CODE_EXPIRY_MS = 20 * 60 * 1000; // 20 minutes
// Wrong guesses allowed before the pending code is invalidated. An 8-digit
// code is far too large to brute-force in 5 tries / 20 minutes.
const MAX_CODE_ATTEMPTS = 5;

function clearPendingFields() {
  return {
    pendingEmail: undefined,
    pendingEmailCode: undefined,
    pendingEmailExpiry: undefined,
    pendingEmailAttempts: undefined,
  };
}

function generateCode() {
  const digits = new Uint32Array(8);
  crypto.getRandomValues(digits);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += (digits[i] % 10).toString();
  }
  return out;
}

export const initiate = mutation({
  args: { newEmail: v.string() },
  handler: async (ctx, { newEmail }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new ConvexError("Please enter a valid email address.");
    }

    const user = await ctx.db.get(userId);
    if (user?.email === email) {
      throw new ConvexError("This is already your current email.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new ConvexError("This email is already associated with another account.");
    }

    const code = generateCode();
    const expiry = Date.now() + CODE_EXPIRY_MS;

    await ctx.db.patch(userId, {
      pendingEmail: email,
      pendingEmailCode: code,
      pendingEmailExpiry: expiry,
      pendingEmailAttempts: 0,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.emailChangeActions.sendVerificationEmail,
      { email, code }
    );
  },
});

// Failure paths RETURN { ok: false } instead of throwing: a thrown error
// rolls back the whole mutation, which would discard the attempt counter
// (and the expired-code cleanup), leaving the code guessable forever.
export const verify = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.pendingEmail || !user?.pendingEmailCode || !user?.pendingEmailExpiry) {
      return { ok: false, error: "No pending email change." };
    }

    if (Date.now() > user.pendingEmailExpiry) {
      await ctx.db.patch(userId, clearPendingFields());
      return {
        ok: false,
        error: "Verification code expired. Please request a new one.",
      };
    }

    if (code.trim() !== user.pendingEmailCode) {
      const attempts = (user.pendingEmailAttempts ?? 0) + 1;
      if (attempts >= MAX_CODE_ATTEMPTS) {
        await ctx.db.patch(userId, clearPendingFields());
        return {
          ok: false,
          error: "Too many incorrect attempts. Please request a new code.",
        };
      }
      await ctx.db.patch(userId, { pendingEmailAttempts: attempts });
      return { ok: false, error: "Invalid verification code." };
    }

    const newEmail = user.pendingEmail;

    const dupe = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", newEmail))
      .first();
    if (dupe && dupe._id !== userId) {
      return {
        ok: false,
        error: "This email is already associated with another account.",
      };
    }

    await ctx.db.patch(userId, {
      email: newEmail,
      ...clearPendingFields(),
    });

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password")
      )
      .first();
    if (account) {
      await ctx.db.patch(account._id, { providerAccountId: newEmail });
    }

    return { ok: true };
  },
});

export const cancel = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    await ctx.db.patch(userId, clearPendingFields());
  },
});
