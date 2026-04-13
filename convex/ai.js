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

const ALL_KB_CATEGORIES = [
  "company_context",
  "team_people",
  "product_technology",
  "processes_workflows",
  "goals_notes",
  "industry_market",
];

export const generatePlan = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const onboardingData = await ctx.runQuery(api.onboarding.getByUserId, {
      userId: args.userId,
    });
    if (!onboardingData) throw new Error("No onboarding data found");

    const goalLabels = {
      relationships: "Build key relationships",
      product_landscape: "Understand the product & tech landscape",
      quick_win: "Deliver a quick win",
      processes: "Define or refine team processes",
      roadmap: "Build a strategic roadmap",
      culture: "Learn the company culture",
    };

    const selectedGoalsList = (onboardingData.selectedGoals || [])
      .map((id) => goalLabels[id] || id)
      .join(", ");

    const userContext = `
Role: ${onboardingData.roleTitle}
Company: ${onboardingData.companyName} (${onboardingData.companySize}, ${onboardingData.companyStage})
Role Type: ${onboardingData.roleType}
Function: ${onboardingData.function_}
Team Size: ${onboardingData.teamSize || "N/A"}
Reports To: ${onboardingData.reportsTo || "Not specified"}
New Team: ${onboardingData.isNewTeam ? "Yes" : "No"}
Work Model: ${onboardingData.workModel}
Industry: ${onboardingData.industry || "Not specified"}
STARS Situation: ${onboardingData.starsSituation}
Experience: ${onboardingData.experienceYears} years
First at this level: ${onboardingData.isFirstRoleAtLevel ? "Yes" : "No"}
Start Date: ${onboardingData.startDate}
Priority Goals: ${selectedGoalsList || "Not specified"}
${onboardingData.existingContext ? `Existing Knowledge: ${onboardingData.existingContext}` : ""}
${onboardingData.challenges ? `Known Challenges: ${onboardingData.challenges}` : ""}
${onboardingData.successDefinition ? `Success Definition: ${onboardingData.successDefinition}` : ""}
`.trim();

    // Pull KB context — the unlock. Every existing KB doc + memory now flows
    // into the plan prompt so the plan is grounded in what we already know
    // about this user's company, team, and notes.
    const kbContext = await fetchContextForPlanning(ctx, {
      userId: args.userId,
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

    const phases = [
      { number: 1, name: "Learn", startDay: 1, endDay: 30 },
      { number: 2, name: "Contribute", startDay: 31, endDay: 60 },
      { number: 3, name: "Lead", startDay: 61, endDay: 90 },
    ];

    let allActivities = [];

    for (const phase of phases) {
      const prompt = `Generate a detailed plan for Phase ${phase.number} (${phase.name}, days ${phase.startDay}-${phase.endDay}) for this professional:

${userContext}

Generate exactly 20 activities for this phase. Return ONLY a JSON array where each element has:
{
  "title": "string",
  "description": "string",
  "category": "learning" | "shipping" | "relationships" | "influence",
  "estimatedTime": "string (e.g. 30m, 1h, 2h)",
  "priority": "High" | "Medium" | "Low",
  "scheduledDay": number (${phase.startDay}-${phase.endDay})
}

Distribute activities evenly across the days. Include a mix of all categories appropriate for this phase.`;

      const response = await generateText(systemPrompt, prompt);

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          allActivities = allActivities.concat(
            parsed.map((a) => ({
              ...a,
              phaseNumber: phase.number,
            }))
          );
        }
      } catch (e) {
        console.error(`Failed to parse Phase ${phase.number} response:`, e);
      }
    }

    await ctx.runMutation(api.planMutations.savePlan, {
      userId: args.userId,
      activities: allActivities,
    });

    // Audit: record that the plan generation pulled this context
    if (kbContext.citations.length > 0 || kbContext.memories.length > 0) {
      try {
        await recordRetrieval(ctx, {
          userId: args.userId,
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
      activitiesGenerated: allActivities.length,
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
