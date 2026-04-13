"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  generateText,
  WATKINS_SYSTEM_PROMPT,
  ACTIVITY_SUGGESTION_PROMPT,
  WEEKLY_INSIGHT_PROMPT,
} from "./lib/ai";
import {
  fetchContextForPlanning,
  recordRetrieval,
} from "./lib/kbContext.js";
import {
  buildUserContext,
  buildMetaPrompt,
  buildPhaseActivityPrompt,
  extractJsonArray,
  extractJsonObject,
  PHASES,
} from "./lib/planPrompts.js";

const ALL_KB_CATEGORIES = [
  "company_context",
  "team_people",
  "product_technology",
  "processes_workflows",
  "goals_notes",
  "industry_market",
];

/**
 * Draft a full 90-day plan (goals, week themes, activities) for a user
 * from their onboarding context + KB. Called from the onboarding flow
 * (first run) and from the /plan page (regenerate).
 *
 * Failure behaviour: if any phase prompt fails to return parseable JSON
 * OR the meta prompt can't produce goals, we fall through to
 * `savePlanFallback` so the user never ends up with a broken/empty
 * plan. Partial successes are allowed — if one phase parses cleanly
 * and another doesn't, we save what we got rather than nuking the run.
 */
export const generatePlan = action({
  args: {
    userId: v.optional(v.id("users")),
    regenerate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Prefer the authenticated caller; fall back to the explicit userId
    // arg so the existing onboarding flow (which passes viewer._id)
    // keeps working unchanged. We resolve auth via a sibling query so
    // the Node action doesn't need to import @convex-dev/auth directly.
    const authUserId = await ctx.runQuery(
      api.planMutations.getAuthenticatedUserId,
      {}
    );
    const userId = authUserId || args.userId;
    if (!userId) throw new Error("Not authenticated");
    // If the arg was passed explicitly and doesn't match auth, refuse —
    // prevents a client from triggering generation for someone else.
    if (authUserId && args.userId && authUserId !== args.userId) {
      throw new Error("Not authorized");
    }

    const regenerate = args.regenerate === true;

    const onboardingData = await ctx.runQuery(api.onboarding.getByUserId, {
      userId,
    });
    if (!onboardingData) throw new Error("No onboarding data found");

    const userContext = buildUserContext(onboardingData);

    // Pull KB context — the unlock. Every existing KB doc + memory flows
    // into the plan prompt so the plan is grounded in what we already know
    // about this user's company, team, and notes.
    const kbContext = await fetchContextForPlanning(ctx, {
      userId,
      query: userContext,
      categories: ALL_KB_CATEGORIES,
      topK: 12,
      includeMemories: true,
    });

    // Build a system prompt that includes the KB context block above the
    // base Watkins prompt — context first so the model anchors on it.
    const systemPrompt = kbContext.contextText
      ? `${kbContext.contextText}\n\n${WATKINS_SYSTEM_PROMPT}`
      : WATKINS_SYSTEM_PROMPT;

    // ── Round-trip 1: goals + week themes ────────────────────────────
    let goals = [];
    let weekThemes = null;
    try {
      const metaResponse = await generateText(
        systemPrompt,
        buildMetaPrompt(userContext)
      );
      const parsed = extractJsonObject(metaResponse);
      if (parsed && Array.isArray(parsed.goals) && parsed.goals.length > 0) {
        goals = parsed.goals
          .filter(
            (g) =>
              g &&
              typeof g.title === "string" &&
              typeof g.targetPhase === "number" &&
              typeof g.category === "string"
          )
          .slice(0, 8)
          .map((g) => ({
            title: g.title.trim(),
            targetPhase: Math.max(1, Math.min(3, Math.round(g.targetPhase))),
            category: g.category.trim(),
          }));
      }
      if (
        parsed &&
        Array.isArray(parsed.weekThemes) &&
        parsed.weekThemes.length === 12 &&
        parsed.weekThemes.every((t) => typeof t === "string" && t.trim())
      ) {
        weekThemes = parsed.weekThemes.map((t) => t.trim());
      }
    } catch (e) {
      console.error("[generatePlan] meta prompt failed:", e?.message);
    }

    // If the model gave us no usable goals we can't ground the per-phase
    // activity prompts, so fall through to the static template.
    if (goals.length === 0) {
      console.warn(
        "[generatePlan] no goals produced — falling back to static template"
      );
      await ctx.runMutation(api.planMutations.savePlanFallback, {
        userId,
        regenerate,
      });
      return {
        source: "fallback",
        reason: "meta_parse_failed",
        activitiesGenerated: 0,
        kbDocsUsed: kbContext.citations.length,
        kbMemoriesUsed: kbContext.memories.length,
      };
    }

    // ── Round-trips 2-4: per-phase activities ────────────────────────
    let allActivities = [];
    for (const phase of PHASES) {
      try {
        const response = await generateText(
          systemPrompt,
          buildPhaseActivityPrompt(userContext, phase, goals)
        );
        const parsed = extractJsonArray(response);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .filter(
              (a) =>
                a &&
                typeof a.title === "string" &&
                typeof a.description === "string" &&
                typeof a.category === "string" &&
                typeof a.estimatedTime === "string" &&
                typeof a.priority === "string" &&
                typeof a.scheduledDay === "number"
            )
            .map((a) => {
              const day = Math.max(
                phase.startDay,
                Math.min(phase.endDay, Math.round(a.scheduledDay))
              );
              const goalIndex =
                typeof a.goalIndex === "number" &&
                a.goalIndex >= 0 &&
                a.goalIndex < goals.length
                  ? a.goalIndex
                  : null;
              return {
                title: a.title.trim(),
                description: a.description.trim(),
                category: a.category.trim(),
                estimatedTime: a.estimatedTime.trim(),
                priority: a.priority.trim(),
                scheduledDay: day,
                phaseNumber: phase.number,
                goalIndex,
              };
            });
          allActivities = allActivities.concat(cleaned);
        }
      } catch (e) {
        console.error(
          `[generatePlan] phase ${phase.number} prompt failed:`,
          e?.message
        );
      }
    }

    // If every phase failed we have goals but no activities — that's
    // worse than the fallback template. Prefer the static plan.
    if (allActivities.length === 0) {
      console.warn(
        "[generatePlan] no activities produced — falling back to static template"
      );
      await ctx.runMutation(api.planMutations.savePlanFallback, {
        userId,
        regenerate,
      });
      return {
        source: "fallback",
        reason: "no_activities",
        activitiesGenerated: 0,
        kbDocsUsed: kbContext.citations.length,
        kbMemoriesUsed: kbContext.memories.length,
      };
    }

    await ctx.runMutation(api.planMutations.savePlan, {
      userId,
      regenerate,
      goals,
      weekThemes: weekThemes || undefined,
      activities: allActivities,
    });

    // Audit: record that the plan generation pulled this context.
    if (kbContext.citations.length > 0 || kbContext.memories.length > 0) {
      try {
        await recordRetrieval(ctx, {
          userId,
          feature: "plan_generation",
          documentIds: kbContext.citations
            .map((c) => c.documentId)
            .filter(Boolean),
          memoryIds: kbContext.memories.map((m) => m._id),
        });
      } catch (e) {
        console.warn("[generatePlan] recordRetrieval failed", e?.message);
      }
    }

    return {
      source: "ai",
      activitiesGenerated: allActivities.length,
      goalsGenerated: goals.length,
      weekThemesGenerated: weekThemes ? weekThemes.length : 0,
      kbDocsUsed: kbContext.citations.length,
      kbMemoriesUsed: kbContext.memories.length,
    };
  },
});

// savePlan is defined in convex/planMutations.js as a proper mutation

export const suggestActivities = action({
  args: {
    userId: v.optional(v.id("users")),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    let kbBlock = "";
    if (args.userId) {
      const kbContext = await fetchContextForPlanning(ctx, {
        userId: args.userId,
        query: args.context,
        topK: 6,
        includeMemories: true,
      });
      if (kbContext.contextText) kbBlock = `${kbContext.contextText}\n\n`;
    }

    const response = await generateText(
      WATKINS_SYSTEM_PROMPT,
      `${kbBlock}${ACTIVITY_SUGGESTION_PROMPT}\n\nUser's current context:\n${args.context}\n\nRespond with ONLY a JSON array.`
    );

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse suggestions:", e);
    }
    return [];
  },
});

export const generateWeeklyInsight = action({
  args: {
    userId: v.optional(v.id("users")),
    weekData: v.string(),
  },
  handler: async (ctx, args) => {
    let kbBlock = "";
    if (args.userId) {
      const kbContext = await fetchContextForPlanning(ctx, {
        userId: args.userId,
        query: args.weekData,
        topK: 6,
        includeMemories: true,
      });
      if (kbContext.contextText) kbBlock = `${kbContext.contextText}\n\n`;
    }

    const response = await generateText(
      WATKINS_SYSTEM_PROMPT,
      `${kbBlock}${WEEKLY_INSIGHT_PROMPT}\n\nWeek data:\n${args.weekData}`
    );
    return response;
  },
});
