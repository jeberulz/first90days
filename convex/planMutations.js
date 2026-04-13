import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import {
  FALLBACK_GOALS,
  FALLBACK_WEEK_THEMES,
  FALLBACK_ACTIVITIES,
} from "./lib/planTemplate.js";

/**
 * Resolve the authenticated user id. Exposed as a query so the Node
 * action in convex/ai.js can authorize itself via ctx.runQuery without
 * importing @convex-dev/auth into the Node runtime.
 */
export const getAuthenticatedUserId = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    return userId ?? null;
  },
});

const DEFAULT_WEEK_THEMES = FALLBACK_WEEK_THEMES;

const PHASE_DATA = [
  {
    number: 1,
    name: "Learn",
    startDay: 1,
    endDay: 30,
    milestone: "Understand context and build key relationships",
    status: "active",
  },
  {
    number: 2,
    name: "Contribute",
    startDay: 31,
    endDay: 60,
    milestone: "Deliver first tangible results",
    status: "upcoming",
  },
  {
    number: 3,
    name: "Lead",
    startDay: 61,
    endDay: 90,
    milestone: "Own outcomes and influence direction",
    status: "upcoming",
  },
];

const DEFAULT_REVIEW_QUESTIONS = [
  "What were your biggest accomplishments this week?",
  "What challenges did you face?",
  "What did you learn?",
  "How are your relationships progressing?",
  "Top priority for next week?",
];

/**
 * Tear down everything about a user's existing plan so `savePlan` can
 * rebuild it in place. Used for the "regenerate plan" flow.
 *
 * We keep: plans row (so collaborators / invitations stay attached),
 * onboardingData, stakeholders, and KB docs.
 * We drop: phases, weeks, activities, goals, and any plan comments
 * that target weeks/activities/goals (their ids become invalid).
 */
async function tearDownPlanContents(ctx, userId, planId) {
  // Weeks, activities, phases, goals — bounded per user so .collect() is ok
  const [weeks, activities, phases, goals, comments] = await Promise.all([
    ctx.db.query("weeks").withIndex("by_plan", (q) => q.eq("planId", planId)).collect(),
    ctx.db.query("activities").withIndex("by_plan", (q) => q.eq("planId", planId)).collect(),
    ctx.db.query("phases").withIndex("by_plan", (q) => q.eq("planId", planId)).collect(),
    ctx.db.query("goals").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ctx.db.query("planComments").withIndex("by_plan", (q) => q.eq("planId", planId)).collect(),
  ]);

  // Drop any comment that targets a week / activity / goal — those ids
  // are about to become invalid. Plan-level comments survive.
  for (const c of comments) {
    if (c.targetType === "week" || c.targetType === "activity" || c.targetType === "goal") {
      await ctx.db.delete(c._id);
    }
  }

  for (const a of activities) await ctx.db.delete(a._id);
  for (const w of weeks) await ctx.db.delete(w._id);
  for (const p of phases) await ctx.db.delete(p._id);
  for (const g of goals) await ctx.db.delete(g._id);
}

const goalInputValidator = v.object({
  title: v.string(),
  targetPhase: v.number(),
  category: v.string(),
});

const activityInputValidator = v.object({
  title: v.string(),
  description: v.string(),
  category: v.string(),
  estimatedTime: v.string(),
  priority: v.string(),
  scheduledDay: v.number(),
  phaseNumber: v.number(),
  goalIndex: v.optional(v.union(v.number(), v.null())),
});

/**
 * Assert the authed caller is `argUserId`. Both savePlan paths take
 * userId as an argument (so the Node action in convex/ai.js can
 * authorize via runQuery then call savePlan on behalf of the same
 * user), but we still need to make sure no authed caller can point
 * `userId` at someone else's row and overwrite their plan — regenerate
 * mode tears down the existing plan in place, so this is a destructive
 * cross-user vector without the check.
 */
async function assertCallerOwnsUserId(ctx, argUserId) {
  const callerId = await auth.getUserId(ctx);
  if (!callerId) throw new Error("Not authenticated");
  if (callerId !== argUserId) {
    throw new Error("Not authorized");
  }
}

/**
 * Persist a full plan tree from an AI draft (or a regeneration).
 *
 * Shape: goals first so activities can reference them by index via
 * `goalIndex`; week themes are optional and fall back to the generic
 * progression; regenerate mode tears down the existing plan contents
 * in place and preserves the plans._id so collaborators stay attached.
 */
export const savePlan = mutation({
  args: {
    userId: v.id("users"),
    regenerate: v.optional(v.boolean()),
    goals: v.array(goalInputValidator),
    weekThemes: v.optional(v.array(v.string())),
    activities: v.array(activityInputValidator),
  },
  handler: async (ctx, args) => {
    const { userId, regenerate, goals, weekThemes, activities } = args;
    await assertCallerOwnsUserId(ctx, userId);

    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let planId;
    if (existingPlan) {
      if (!regenerate) throw new Error("Plan already exists");
      await tearDownPlanContents(ctx, userId, existingPlan._id);
      await ctx.db.patch(existingPlan._id, {
        status: "active",
        overallCompletion: 0,
      });
      planId = existingPlan._id;
    } else {
      planId = await ctx.db.insert("plans", {
        userId,
        status: "active",
        overallCompletion: 0,
      });
    }

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const startDate = onboarding ? new Date(onboarding.startDate) : new Date();

    // Phases — always the same 3, framework-locked.
    const phaseIds = {};
    for (const p of PHASE_DATA) {
      const id = await ctx.db.insert("phases", { planId, userId, ...p });
      phaseIds[p.number] = id;
    }

    // Weeks — themes come from AI when available, fall back otherwise.
    const themes =
      Array.isArray(weekThemes) && weekThemes.length === 12
        ? weekThemes
        : DEFAULT_WEEK_THEMES;
    const weekIds = {};
    for (let w = 1; w <= 12; w++) {
      const phaseNum = w <= 4 ? 1 : w <= 8 ? 2 : 3;
      const id = await ctx.db.insert("weeks", {
        planId,
        phaseId: phaseIds[phaseNum],
        userId,
        number: w,
        theme: themes[w - 1] || DEFAULT_WEEK_THEMES[w - 1],
        reflectionPrompt: `What stood out to you during week ${w}?`,
        reviewQuestions: DEFAULT_REVIEW_QUESTIONS,
      });
      weekIds[w] = id;
    }

    // Goals — insert first so activities can reference them by index.
    const goalIds = [];
    for (const g of goals) {
      const goalId = await ctx.db.insert("goals", {
        userId,
        title: g.title,
        targetPhase: g.targetPhase,
        category: g.category,
        status: "not_started",
      });
      goalIds.push(goalId);
    }

    // Activities — map goalIndex → relatedGoalId.
    for (const activity of activities) {
      const weekNum = Math.min(Math.ceil(activity.scheduledDay / 7), 12);
      const actDate = new Date(startDate);
      actDate.setDate(actDate.getDate() + (activity.scheduledDay - 1));

      const relatedGoalId =
        typeof activity.goalIndex === "number" &&
        activity.goalIndex >= 0 &&
        activity.goalIndex < goalIds.length
          ? goalIds[activity.goalIndex]
          : undefined;

      await ctx.db.insert("activities", {
        planId,
        weekId: weekIds[weekNum],
        userId,
        weekNumber: weekNum,
        title: activity.title,
        description: activity.description,
        category: activity.category,
        estimatedTime: activity.estimatedTime,
        priority: activity.priority,
        scheduledDate: actDate.toISOString().split("T")[0],
        scheduledDay: activity.scheduledDay,
        status: "upcoming",
        isCustom: false,
        source: "ai",
        relatedGoalId,
      });
    }

    await ctx.db.patch(userId, { onboardingComplete: true });
    return planId;
  },
});

/**
 * Fallback path: if the AI draft fails (bad JSON, rate limit, missing
 * key), fall through to a static Watkins-aligned template so the user
 * still ends onboarding with a usable plan. Shares the same insertion
 * logic as the AI path via the template constants.
 */
export const savePlanFallback = mutation({
  args: {
    userId: v.id("users"),
    regenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, regenerate } = args;
    await assertCallerOwnsUserId(ctx, userId);

    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let planId;
    if (existingPlan) {
      if (!regenerate) throw new Error("Plan already exists");
      await tearDownPlanContents(ctx, userId, existingPlan._id);
      await ctx.db.patch(existingPlan._id, {
        status: "active",
        overallCompletion: 0,
      });
      planId = existingPlan._id;
    } else {
      planId = await ctx.db.insert("plans", {
        userId,
        status: "active",
        overallCompletion: 0,
      });
    }

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const startDate = onboarding ? new Date(onboarding.startDate) : new Date();

    const phaseIds = {};
    for (const p of PHASE_DATA) {
      const id = await ctx.db.insert("phases", { planId, userId, ...p });
      phaseIds[p.number] = id;
    }

    const weekIds = {};
    for (let w = 1; w <= 12; w++) {
      const phaseNum = w <= 4 ? 1 : w <= 8 ? 2 : 3;
      const id = await ctx.db.insert("weeks", {
        planId,
        phaseId: phaseIds[phaseNum],
        userId,
        number: w,
        theme: FALLBACK_WEEK_THEMES[w - 1],
        reflectionPrompt: `What stood out to you during week ${w}?`,
        reviewQuestions: DEFAULT_REVIEW_QUESTIONS,
      });
      weekIds[w] = id;
    }

    const goalIds = [];
    for (const g of FALLBACK_GOALS) {
      const goalId = await ctx.db.insert("goals", {
        userId,
        title: g.title,
        targetPhase: g.targetPhase,
        category: g.category,
        status: "not_started",
      });
      goalIds.push(goalId);
    }

    for (const activity of FALLBACK_ACTIVITIES) {
      const weekNum = Math.min(Math.ceil(activity.scheduledDay / 7), 12);
      const actDate = new Date(startDate);
      actDate.setDate(actDate.getDate() + (activity.scheduledDay - 1));

      const relatedGoalId =
        typeof activity.goalIndex === "number" &&
        activity.goalIndex >= 0 &&
        activity.goalIndex < goalIds.length
          ? goalIds[activity.goalIndex]
          : undefined;

      await ctx.db.insert("activities", {
        planId,
        weekId: weekIds[weekNum],
        userId,
        weekNumber: weekNum,
        title: activity.title,
        description: activity.description,
        category: activity.category,
        estimatedTime: activity.estimatedTime,
        priority: activity.priority,
        scheduledDate: actDate.toISOString().split("T")[0],
        scheduledDay: activity.scheduledDay,
        status: "upcoming",
        isCustom: false,
        source: "fallback",
        relatedGoalId,
      });
    }

    await ctx.db.patch(userId, { onboardingComplete: true });
    return planId;
  },
});
