"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

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
    // Identity is derived strictly from the authenticated session — per
    // convex/_generated/ai/guidelines.md, we never trust a caller-supplied
    // userId for authorization. We resolve auth via a sibling query so the
    // Node action doesn't need to import @convex-dev/auth directly.
    const authUserId = await ctx.runQuery(
      api.planMutations.getAuthenticatedUserId,
      {}
    );
    if (!authUserId) throw new Error("Not authenticated");
    // The legacy `userId` arg is kept only so existing callers don't
    // break; if it's passed it must match auth, otherwise refuse.
    if (args.userId && authUserId !== args.userId) {
      throw new Error("Not authorized");
    }
    const userId = authUserId;

    // Reserve daily AI budget up front. Throws ConvexError to the client
    // if the user is over their daily ceiling — caught by the UI as a
    // friendly limit message rather than a stack trace.
    await ctx.runMutation(internal.rateLimit.reserve, {
      userId,
      op: "generatePlan",
    });

    const regenerate = args.regenerate === true;

    const onboardingData = await ctx.runQuery(api.onboarding.getByUserId, {
      userId,
    });
    if (!onboardingData) throw new Error("No onboarding data found");

    const stakeholders = await ctx.runQuery(api.stakeholders.list, {});

    const userContext = buildUserContext(onboardingData, stakeholders);

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
      if (!regenerate) {
        await ctx.scheduler.runAfter(0, internal.emailActions.sendWelcomeEmail, { userId });
      }
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
      if (!regenerate) {
        await ctx.scheduler.runAfter(0, internal.emailActions.sendWelcomeEmail, { userId });
      }
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

    if (!regenerate) {
      await ctx.scheduler.runAfter(0, internal.emailActions.sendWelcomeEmail, { userId });
    }

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
    context: v.string(),
  },
  handler: async (ctx, args) => {
    // Identity is derived strictly from auth — never trust a client-supplied
    // userId for KB context lookups (would leak another user's documents).
    const userId = await ctx.runQuery(
      api.planMutations.getAuthenticatedUserId,
      {}
    );
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.rateLimit.reserve, {
      userId,
      op: "suggestActivities",
    });

    const kbContext = await fetchContextForPlanning(ctx, {
      userId,
      query: args.context,
      topK: 6,
      includeMemories: true,
    });
    const kbBlock = kbContext.contextText
      ? `${kbContext.contextText}\n\n`
      : "";

    const response = await generateText(
      WATKINS_SYSTEM_PROMPT,
      `${kbBlock}${ACTIVITY_SUGGESTION_PROMPT}\n\nUser's current context:\n${args.context}\n\nRespond with ONLY a JSON array.`
    );

    // Audit: record the retrieval the same way generatePlan and
    // generateWeeklySummary do, so the KB usage log is complete.
    if (kbContext.citations.length > 0 || kbContext.memories.length > 0) {
      try {
        await recordRetrieval(ctx, {
          userId,
          feature: "activity_suggestions",
          documentIds: kbContext.citations
            .map((c) => c.documentId)
            .filter(Boolean),
          memoryIds: kbContext.memories.map((m) => m._id),
        });
      } catch (e) {
        console.warn("[suggestActivities] recordRetrieval failed", e?.message);
      }
    }

    const parsed = extractJsonArray(response);
    return Array.isArray(parsed) ? parsed : [];
  },
});

export const generateWeeklyInsight = action({
  args: {
    weekData: v.string(),
  },
  handler: async (ctx, args) => {
    // Identity derived strictly from auth — never trust a client-supplied
    // userId for KB context lookups.
    const userId = await ctx.runQuery(
      api.planMutations.getAuthenticatedUserId,
      {}
    );
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.rateLimit.reserve, {
      userId,
      op: "generateWeeklyInsight",
    });

    const kbContext = await fetchContextForPlanning(ctx, {
      userId,
      query: args.weekData,
      topK: 6,
      includeMemories: true,
    });
    const kbBlock = kbContext.contextText
      ? `${kbContext.contextText}\n\n`
      : "";

    const response = await generateText(
      WATKINS_SYSTEM_PROMPT,
      `${kbBlock}${WEEKLY_INSIGHT_PROMPT}\n\nWeek data:\n${args.weekData}`
    );

    if (kbContext.citations.length > 0 || kbContext.memories.length > 0) {
      try {
        await recordRetrieval(ctx, {
          userId,
          feature: "weekly_insight",
          documentIds: kbContext.citations
            .map((c) => c.documentId)
            .filter(Boolean),
          memoryIds: kbContext.memories.map((m) => m._id),
        });
      } catch (e) {
        console.warn(
          "[generateWeeklyInsight] recordRetrieval failed",
          e?.message
        );
      }
    }

    return response;
  },
});

/**
 * Format a weekly review + its activities into a compact context block
 * for the summary prompt. Kept inline so we can tune the shape without
 * spreading plan-prompt helpers across files.
 */
function formatWeekDataForPrompt(review, activities) {
  const lines = [];
  lines.push(`Week ${review.weekNumber} review · ${review.date}`);
  lines.push(
    `Self-rating: ${review.rating}/5 · Activities ${review.activitiesCompleted}/${review.activitiesPlanned}`
  );

  if (activities.length > 0) {
    const completed = activities.filter((a) => a.status === "completed");
    const skipped = activities.filter((a) => a.status === "skipped");
    const upcoming = activities.filter((a) => a.status === "upcoming");

    // Category rollup — useful signal for balance commentary.
    const byCategory = {};
    for (const a of activities) {
      const c = a.category || "other";
      if (!byCategory[c]) byCategory[c] = { total: 0, done: 0 };
      byCategory[c].total += 1;
      if (a.status === "completed") byCategory[c].done += 1;
    }
    lines.push("");
    lines.push("Category split:");
    for (const [cat, n] of Object.entries(byCategory)) {
      lines.push(`  - ${cat}: ${n.done}/${n.total}`);
    }

    if (completed.length > 0) {
      lines.push("");
      lines.push("Completed this week:");
      for (const a of completed.slice(0, 15)) {
        lines.push(
          `  - [${a.category}] ${a.title}${a.completionNotes ? ` — ${a.completionNotes}` : ""}`
        );
      }
    }
    if (upcoming.length > 0) {
      lines.push("");
      lines.push("Not completed:");
      for (const a of upcoming.slice(0, 10)) {
        lines.push(`  - [${a.category}] ${a.title}`);
      }
    }
    if (skipped.length > 0) {
      lines.push("");
      lines.push("Intentionally skipped:");
      for (const a of skipped.slice(0, 5)) {
        lines.push(
          `  - [${a.category}] ${a.title}${a.skipReason ? ` — ${a.skipReason}` : ""}`
        );
      }
    }
  }

  if (review.questionResponses && review.questionResponses.length > 0) {
    lines.push("");
    lines.push("User's own reflections:");
    for (const q of review.questionResponses) {
      if (!q.response || !q.response.trim()) continue;
      lines.push(`Q: ${q.question}`);
      lines.push(`A: ${q.response}`);
      lines.push("");
    }
  }

  if (review.notes) {
    lines.push(`Additional notes: ${review.notes}`);
  }

  return lines.join("\n");
}

/**
 * Auto-generate the weekly summary after the user submits a review.
 * Scheduled from reflections.saveWeeklyReview. On failure we patch
 * status=failed so the UI can offer a retry instead of spinning
 * forever. KB context is pulled per-user so the summary grounds itself
 * in the user's documents + memories.
 */
export const generateWeeklySummary = internalAction({
  args: { reviewId: v.id("weeklyReviews") },
  handler: async (ctx, { reviewId }) => {
    // Mark as generating so the UI can show a spinner immediately.
    try {
      await ctx.runMutation(internal.reflections.setWeeklySummary, {
        reviewId,
        status: "generating",
      });
    } catch (e) {
      console.error("[generateWeeklySummary] could not mark generating", e);
      return;
    }

    // Single try/catch around every read + generate step so any failure
    // — vanished row, query error, KB hiccup, model timeout — lands the
    // review in a terminal "failed" status instead of leaving the UI
    // spinning on "generating" forever.
    try {
      const review = await ctx.runQuery(
        internal.reflections.getWeeklyReviewInternal,
        { reviewId }
      );
      if (!review) {
        console.warn("[generateWeeklySummary] review row vanished", reviewId);
        // Best-effort: mark failed if the row reappeared between the
        // read and now. setWeeklySummary will no-op for a missing row.
        await ctx.runMutation(internal.reflections.setWeeklySummary, {
          reviewId,
          status: "failed",
          error: "Review not found",
        });
        return;
      }

      const activities = await ctx.runQuery(
        internal.reflections.getActivitiesForWeekInternal,
        { userId: review.userId, weekNumber: review.weekNumber }
      );

      const weekData = formatWeekDataForPrompt(review, activities);

      const kbContext = await fetchContextForPlanning(ctx, {
        userId: review.userId,
        query: weekData,
        topK: 6,
        includeMemories: true,
      });
      const kbBlock = kbContext.contextText
        ? `${kbContext.contextText}\n\n`
        : "";

      const summary = await generateText(
        WATKINS_SYSTEM_PROMPT,
        `${kbBlock}${WEEKLY_INSIGHT_PROMPT}\n\nWeek data:\n${weekData}`
      );

      await ctx.runMutation(internal.reflections.setWeeklySummary, {
        reviewId,
        status: "done",
        summary: summary.trim(),
      });

      // Record retrieval for audit, matching the plan-generation path.
      if (kbContext.citations.length > 0 || kbContext.memories.length > 0) {
        try {
          await recordRetrieval(ctx, {
            userId: review.userId,
            feature: "weekly_summary",
            documentIds: kbContext.citations
              .map((c) => c.documentId)
              .filter(Boolean),
            memoryIds: kbContext.memories.map((m) => m._id),
          });
        } catch (e) {
          console.warn(
            "[generateWeeklySummary] recordRetrieval failed",
            e?.message
          );
        }
      }
    } catch (err) {
      console.error("[generateWeeklySummary] generation failed", err);
      try {
        await ctx.runMutation(internal.reflections.setWeeklySummary, {
          reviewId,
          status: "failed",
          error: err instanceof Error ? err.message : "Generation failed",
        });
      } catch (markErr) {
        // We tried our best — the review row may genuinely be gone.
        console.error(
          "[generateWeeklySummary] could not record failure",
          markErr
        );
      }
    }
  },
});
