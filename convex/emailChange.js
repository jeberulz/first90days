import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const CODE_EXPIRY_MS = 20 * 60 * 1000; // 20 minutes

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
      .withIndex("by_email", (q) => q.eq("email", email))
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
    });

    await ctx.scheduler.runAfter(
      0,
      internal.emailChangeActions.sendVerificationEmail,
      { email, code }
    );
  },
});

export const verify = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.pendingEmail || !user?.pendingEmailCode || !user?.pendingEmailExpiry) {
      throw new ConvexError("No pending email change.");
    }

    if (Date.now() > user.pendingEmailExpiry) {
      await ctx.db.patch(userId, {
        pendingEmail: undefined,
        pendingEmailCode: undefined,
        pendingEmailExpiry: undefined,
      });
      throw new ConvexError("Verification code expired. Please request a new one.");
    }

    if (code.trim() !== user.pendingEmailCode) {
      throw new ConvexError("Invalid verification code.");
    }

    const newEmail = user.pendingEmail;

    const dupe = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", newEmail))
      .first();
    if (dupe && dupe._id !== userId) {
      throw new ConvexError("This email is already associated with another account.");
    }

    await ctx.db.patch(userId, {
      email: newEmail,
      pendingEmail: undefined,
      pendingEmailCode: undefined,
      pendingEmailExpiry: undefined,
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
  },
});

export const cancel = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    await ctx.db.patch(userId, {
      pendingEmail: undefined,
      pendingEmailCode: undefined,
      pendingEmailExpiry: undefined,
    });
  },
});
