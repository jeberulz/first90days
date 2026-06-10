import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { isPilotEmail, PILOT_PLAN_START_DATE } from "./lib/pilotUser";
import {
  computePlanDayInfo,
  resolveUserTimezone,
} from "./lib/planDates";
import { computeEntitlements } from "./billing";

function splitFullName(fullName) {
  const t = fullName?.trim();
  if (!t) return { first: undefined, last: undefined };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: undefined };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function joinNameParts(first, last) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const full = [f, l].filter(Boolean).join(" ");
  return full || undefined;
}

/** Returns patch fields for users.name / firstName / lastName, or null if no name args. */
function resolveDisplayNameFields(existing, args) {
  const hasPartials =
    args.firstName !== undefined || args.lastName !== undefined;
  if (hasPartials) {
    const first =
      args.firstName !== undefined
        ? String(args.firstName).trim()
        : (existing?.firstName ?? "").trim();
    const last =
      args.lastName !== undefined
        ? String(args.lastName).trim()
        : (existing?.lastName ?? "").trim();
    const name = joinNameParts(first, last);
    return {
      firstName: first ? first : undefined,
      lastName: last ? last : undefined,
      name,
    };
  }
  if (args.name !== undefined) {
    const trimmed = String(args.name).trim();
    const { first, last } = splitFullName(trimmed);
    return {
      firstName: first,
      lastName: last,
      name: trimmed || undefined,
    };
  }
  return null;
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    let imageUrl = null;
    if (user.image) {
      if (user.image.startsWith("http://") || user.image.startsWith("https://")) {
        imageUrl = user.image;
      } else {
        try {
          imageUrl = await ctx.storage.getUrl(user.image);
        } catch {
          imageUrl = null;
        }
      }
    }

    const entitlements = await computeEntitlements(ctx, userId);

    return {
      ...user,
      imageUrl,
      isPilotUser: isPilotEmail(user.email),
      tier: entitlements?.tier ?? "free",
      isPro: entitlements?.isPro ?? false,
      trialEndsAt: entitlements?.trialEndsAt ?? null,
      trialDaysLeft: entitlements?.trialDaysLeft ?? 0,
      cancelAtPeriodEnd: entitlements?.cancelAtPeriodEnd ?? false,
    };
  },
});

export const getDayNumber = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!onboarding) return null;

    // Pilot read-path override: canonical anchor wins even if DB row is stale.
    const info = computePlanDayInfo({
      user,
      onboarding,
      isPilot: isPilotEmail(user.email),
      pilotStartYmd: PILOT_PLAN_START_DATE,
    });
    if (!info) return null;

    // Public shape — keep the original field set for backwards compat.
    return {
      dayNumber: info.dayNumber,
      daysUntilStart: info.daysUntilStart,
      hasStarted: info.hasStarted,
      totalDays: info.totalDays,
      phase: info.phase,
      phaseName: info.phaseName,
      startDate: info.startDate,
      weekNumber: info.weekNumber,
    };
  },
});

/**
 * Internal: return the resolved timezone for a user, falling back to
 * Europe/London when `settings.timezone` is missing. Used by the rate-limit
 * cents-ledger code path (`convex/lib/rateLimit.js`) so the daily window
 * keys correctly to the user's local midnight rather than UTC midnight.
 *
 * Exposed as an internalQuery so action callers can resolve a timezone
 * without re-reading the full user document.
 */
export const getUserTimezoneInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return { timezone: resolveUserTimezone(user) };
  },
});

export const updateSettings = mutation({
  args: {
    settings: v.object({
      timezone: v.optional(v.string()),
      dailyReminderTime: v.optional(v.string()),
      reflectionReminderTime: v.optional(v.string()),
      weekStartDay: v.optional(v.string()),
      emailNotifications: v.optional(v.boolean()),
      pushNotifications: v.optional(v.boolean()),
      dailyDigest: v.optional(v.boolean()),
      stakeholderUpdates: v.optional(v.boolean()),
      milestoneReminders: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(userId);
    const merged = { ...(existing?.settings ?? {}), ...args.settings };
    await ctx.db.patch(userId, { settings: merged });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId);
    const resolved = resolveDisplayNameFields(existing, args);
    if (resolved) {
      await ctx.db.patch(userId, resolved);
    }

    if (args.roleTitle !== undefined) {
      const onboarding = await ctx.db
        .query("onboardingData")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (onboarding) {
        await ctx.db.patch(onboarding._id, { roleTitle: args.roleTitle });
      }
    }
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId);
    const prev = existing?.image;
    if (prev && !prev.startsWith("http")) {
      try {
        await ctx.storage.delete(prev);
      } catch {
        // ignore cleanup failure
      }
    }

    await ctx.db.patch(userId, { image: args.storageId });
  },
});

export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId);
    const prev = existing?.image;
    if (prev && !prev.startsWith("http")) {
      try {
        await ctx.storage.delete(prev);
      } catch {
        // ignore
      }
    }

    await ctx.db.patch(userId, { image: undefined });
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { onboardingComplete: true });
  },
});

export const saveOnboardingProgress = mutation({
  args: {
    step: v.number(),
    data: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      roleTitle: v.optional(v.string()),
      companyName: v.optional(v.string()),
      startDate: v.optional(v.string()),
      experienceYears: v.optional(v.number()),
      isFirstRoleAtLevel: v.optional(v.boolean()),
      roleType: v.optional(v.string()),
      function_: v.optional(v.string()),
      teamSize: v.optional(v.number()),
      isNewTeam: v.optional(v.boolean()),
      reportsTo: v.optional(v.string()),
      companySize: v.optional(v.string()),
      companyStage: v.optional(v.string()),
      workModel: v.optional(v.string()),
      industry: v.optional(v.string()),
      starsSituation: v.optional(v.string()),
      selectedGoals: v.optional(v.array(v.string())),
      successDefinition: v.optional(v.string()),
      existingContext: v.optional(v.string()),
      challenges: v.optional(v.string()),
      jobDescription: v.optional(v.string()),
      // Free-text role scope (Step 2). Persisted across steps so users
      // don't lose what they typed if a Convex query re-fires and the
      // viewer-restore effect re-hydrates local state.
      scope: v.optional(v.string()),
      // Stakeholders entered on Step 5. They are only flushed to the
      // dedicated stakeholders table on the final handleSubmit (Step 6),
      // so we mirror them here every step to survive client-side
      // state-resyncs.
      stakeholders: v.optional(
        v.array(
          v.object({
            name: v.string(),
            title: v.string(),
            relationship: v.string(),
          })
        )
      ),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      lastOnboardingStep: args.step,
      partialOnboarding: args.data,
    });

    const fn = (args.data.firstName ?? "").trim();
    const ln = (args.data.lastName ?? "").trim();
    if (fn || ln) {
      await ctx.db.patch(userId, {
        firstName: fn || undefined,
        lastName: ln || undefined,
        name: joinNameParts(fn, ln),
      });
    }
  },
});

export const clearOnboardingProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      lastOnboardingStep: undefined,
      partialOnboarding: undefined,
    });
  },
});

// "plans" is intentionally NOT in this list — we defer deleting plan
// rows until every plan comment has been swept (which can span multiple
// batches). Otherwise later retries re-snapshot an empty ownedPlans and
// orphan collaborator-authored comments on the purged plans. The final
// pass deletes plan rows by hand before the user row.
const USER_OWNED_TABLES = [
  "activities",
  "goals",
  "stakeholders",
  "interactions",
  "dailyReflections",
  "weeklyReviews",
  "logEntries",
  "knowledgeEntries",
  "kbDocuments",
  "kbMemories",
  "kbSources",
  "kbEnrichmentJobs",
  "weeks",
  "phases",
  "onboardingData",
  "billingSubscriptions",
];

/**
 * UK GDPR Art 20 right to data portability. Returns a JSON-serializable
 * snapshot of the user's data. Auth secrets and other users' data are
 * never included. The client triggers the download — no streaming or file
 * storage involved.
 */
export const exportMyData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const collectByUser = async (table) =>
      ctx.db.query(table).withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const [
      onboardingData,
      plans,
      phases,
      weeks,
      activities,
      goals,
      stakeholders,
      interactions,
      dailyReflections,
      weeklyReviews,
      logEntries,
      knowledgeEntries,
      whispererThreads,
    ] = await Promise.all([
      collectByUser("onboardingData"),
      collectByUser("plans"),
      collectByUser("phases"),
      collectByUser("weeks"),
      collectByUser("activities"),
      collectByUser("goals"),
      collectByUser("stakeholders"),
      collectByUser("interactions"),
      collectByUser("dailyReflections"),
      collectByUser("weeklyReviews"),
      collectByUser("logEntries"),
      collectByUser("knowledgeEntries"),
      ctx.db
        .query("whispererThreads")
        .withIndex("by_user_status", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    // Whisperer turns are owned via thread → user (no direct userId
    // column), so we join through the threads we just fetched.
    const whispererTurns = [];
    for (const thread of whispererThreads) {
      const turns = await ctx.db
        .query("whispererTurns")
        .withIndex("by_thread_seq", (q) => q.eq("threadId", thread._id))
        .collect();
      whispererTurns.push(...turns);
    }

    // planEventLog uses a compound (userId, createdAt) index; query the
    // by_user_time prefix so we get every row for this user.
    const planEventLog = await ctx.db
      .query("planEventLog")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .collect();

    const { _id, _creationTime, ...userPublic } = user;

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      user: {
        id: _id,
        createdAt: new Date(_creationTime).toISOString(),
        ...userPublic,
      },
      onboardingData,
      plans,
      phases,
      weeks,
      activities,
      goals,
      stakeholders,
      interactions,
      dailyReflections,
      weeklyReviews,
      logEntries,
      knowledgeEntries,
      whispererThreads,
      whispererTurns,
      planEventLog,
    };
  },
});

/**
 * Public delete: schedules the Stripe-cancel action, which (on success)
 * schedules the batched purge. The mutation returns immediately and the
 * client should sign out. If the Stripe cancel fails with an unexpected
 * error, purgeUserData never runs and the user's data stays intact —
 * requiring support intervention rather than leaving a ghost subscription.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.scheduler.runAfter(
      0,
      internal.billingActions.cancelSubscriptionForUser,
      { userId }
    );
  },
});

/**
 * Admin: hard-delete every trace of a user identified by email so the
 * email can sign up fresh. Run via `npx convex run --prod
 * users:purgeAccountForEmail '{"email":"…"}'`. Sweeps the auth tables
 * synchronously (small fan-out per user) and schedules the batched
 * `purgeUserData` to clean user-owned rows and the users row itself.
 *
 * Skips Stripe cancellation on purpose — this path is for orphaned/test
 * accounts that never paid. Use `deleteAccount` for real user-initiated
 * removals.
 */
export const purgeAccountForEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalised = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalised))
      .first();
    if (!user) {
      throw new Error(`No user with email ${normalised}`);
    }
    const userId = user._id;

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) await ctx.db.delete(code._id);
      await ctx.db.delete(account._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    await ctx.scheduler.runAfter(0, internal.users.purgeUserData, { userId });

    return {
      userId,
      accountsDeleted: accounts.length,
      sessionsDeleted: sessions.length,
    };
  },
});

const PURGE_BATCH_SIZE = 100;

/**
 * Internal batched purge: deletes up to PURGE_BATCH_SIZE docs from each
 * user-owned table per invocation. Re-schedules itself if any table still
 * has more rows, so a single call stays under Convex transaction limits.
 * Final pass cleans up the avatar blob and the user document.
 */
export const purgeUserData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    let moreWork = false;

    // Snapshot owned plan ids. Plan rows are NOT deleted in this
    // invocation — they survive until every plan comment has been
    // swept (see USER_OWNED_TABLES comment), so every retry re-queries
    // the same non-empty list and the comment sweep below always has
    // a planId to aim at.
    const ownedPlans = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const ownedPlanIds = ownedPlans.map((p) => p._id);

    for (const table of USER_OWNED_TABLES) {
      const docs = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(PURGE_BATCH_SIZE);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      if (docs.length === PURGE_BATCH_SIZE) {
        moreWork = true;
      }
    }

    // Comments authored by anyone on plans this user owned (including the
    // owner's own comments, which the by_author sweep also covers).
    for (const planId of ownedPlanIds) {
      const planComments = await ctx.db
        .query("planComments")
        .withIndex("by_plan", (q) => q.eq("planId", planId))
        .take(PURGE_BATCH_SIZE);
      for (const row of planComments) await ctx.db.delete(row._id);
      if (planComments.length === PURGE_BATCH_SIZE) moreWork = true;
    }

    // Collaboration tables: the user may be either a plan owner or a
    // collaborator on someone else's plan, and may have authored comments
    // on either their own or a shared plan. Walk each angle.
    const ownedInvites = await ctx.db
      .query("planInvitations")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of ownedInvites) await ctx.db.delete(row._id);
    if (ownedInvites.length === PURGE_BATCH_SIZE) moreWork = true;

    const ownedCollabRows = await ctx.db
      .query("planCollaborators")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of ownedCollabRows) await ctx.db.delete(row._id);
    if (ownedCollabRows.length === PURGE_BATCH_SIZE) moreWork = true;

    const memberships = await ctx.db
      .query("planCollaborators")
      .withIndex("by_collaborator", (q) => q.eq("collaboratorUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of memberships) await ctx.db.delete(row._id);
    if (memberships.length === PURGE_BATCH_SIZE) moreWork = true;

    const authoredComments = await ctx.db
      .query("planComments")
      .withIndex("by_author", (q) => q.eq("authorUserId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of authoredComments) await ctx.db.delete(row._id);
    if (authoredComments.length === PURGE_BATCH_SIZE) moreWork = true;

    // ── Whisperer cascade (U3 / R18) ────────────────────────────────────
    // whispererThreads is keyed by userId directly; whispererTurns has
    // no userId column so we join via the parent thread. We must delete
    // all turns BEFORE the owning thread row so an interrupted batch
    // can resume without orphans. To stay under transaction limits we
    // delete one batch of turns per thread per invocation and only drop
    // a thread once its turn set comes back empty.
    const threads = await ctx.db
      .query("whispererThreads")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .take(PURGE_BATCH_SIZE);

    for (const thread of threads) {
      const turns = await ctx.db
        .query("whispererTurns")
        .withIndex("by_thread_seq", (q) => q.eq("threadId", thread._id))
        .take(PURGE_BATCH_SIZE);
      for (const turn of turns) await ctx.db.delete(turn._id);
      if (turns.length === PURGE_BATCH_SIZE) {
        // Still more turns to delete for this thread; leave the thread
        // row in place so the next invocation finds it again.
        moreWork = true;
      } else {
        await ctx.db.delete(thread._id);
      }
    }
    if (threads.length === PURGE_BATCH_SIZE) moreWork = true;

    // planEventLog uses a compound (userId, createdAt) index; query the
    // by_user_time prefix and batch-delete.
    const eventRows = await ctx.db
      .query("planEventLog")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .take(PURGE_BATCH_SIZE);
    for (const row of eventRows) await ctx.db.delete(row._id);
    if (eventRows.length === PURGE_BATCH_SIZE) moreWork = true;

    if (moreWork) {
      await ctx.scheduler.runAfter(0, internal.users.purgeUserData, { userId });
      return;
    }

    // Final pass: all owned child rows + plan comments have been
    // swept across prior invocations. Drop the plan rows now before
    // the user row. Plan counts per user are tiny (1 typically), so
    // this stays well under the transaction limit without batching.
    for (const plan of ownedPlans) {
      await ctx.db.delete(plan._id);
    }

    const user = await ctx.db.get(userId);
    if (!user) return;

    if (user.image && !user.image.startsWith("http")) {
      try {
        await ctx.storage.delete(user.image);
      } catch {
        // ignore — best-effort cleanup
      }
    }

    await ctx.db.delete(userId);
  },
});
