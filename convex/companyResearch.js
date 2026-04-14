"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateText } from "./lib/ai.js";
import {
  COMPANY_RESEARCH_SYSTEM_PROMPT,
  companyResearchUserPrompt,
  COMPANY_RESEARCH_VALID_ANGLES,
} from "./lib/kbPrompts.js";

/**
 * Cut 1: single-shot company research.
 *
 * Reads onboardingData + optional job description, makes ONE generateText
 * call, parses the JSON array response, and inserts each draft as a
 * kbDocument with draftStatus="pending" and skipPipeline=true. The user
 * then reviews drafts in the DraftReviewQueue and approves or discards.
 *
 * This file is intentionally small: it owns the LLM call and the parse/
 * validate logic. All db reads/writes happen via convex/companyResearchJobs.js
 * which is non-node.
 *
 * Cut 2 will replace the single generateText call with a tool-use agent
 * (web_search, fetch_url, draft_kb_document) and add citations per fact.
 */

const VALID_ANGLE_SET = new Set(COMPANY_RESEARCH_VALID_ANGLES);

/**
 * Best-effort JSON array parser. Tries direct JSON.parse first, then falls
 * back to extracting the first `[...]` block — which handles the common case
 * where the model wraps its response in code fences despite instructions.
 */
function safeParseDrafts(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    /* fall through */
  }
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const generateDraftsForUser = internalAction({
  args: {
    userId: v.id("users"),
    jobId: v.id("companyResearchJobs"),
  },
  handler: async (ctx, { userId, jobId }) => {
    await ctx.runMutation(internal.companyResearchJobs.markJobRunning, {
      jobId,
    });

    try {
      const onboarding = await ctx.runQuery(
        internal.companyResearchJobs.getOnboardingForResearchInternal,
        { userId }
      );
      if (!onboarding) {
        throw new Error("No onboarding data found for user");
      }

      const userPrompt = companyResearchUserPrompt({
        companyName: onboarding.companyName,
        roleTitle: onboarding.roleTitle,
        companySize: onboarding.companySize,
        companyStage: onboarding.companyStage,
        industry: onboarding.industry,
        starsSituation: onboarding.starsSituation,
        scope: onboarding.scope,
        teamSize: onboarding.teamSize,
        workModel: onboarding.workModel,
        experienceYears: onboarding.experienceYears,
        isNewTeam: onboarding.isNewTeam,
        reportsTo: onboarding.reportsTo,
        jobDescription: onboarding.jobDescription,
      });

      const raw = await generateText(
        COMPANY_RESEARCH_SYSTEM_PROMPT,
        userPrompt
      );
      const parsed = safeParseDrafts(raw);
      if (!parsed) {
        throw new Error("Research response did not contain a JSON array");
      }

      let inserted = 0;
      // Hard cap at 12 drafts per run regardless of what the model produces.
      for (const d of parsed.slice(0, 12)) {
        if (
          !d ||
          typeof d.title !== "string" ||
          typeof d.content !== "string" ||
          !d.title.trim() ||
          !d.content.trim()
        ) {
          continue;
        }
        const angle =
          typeof d.angle === "string" && VALID_ANGLE_SET.has(d.angle)
            ? d.angle
            : "mission_values";

        await ctx.runMutation(
          internal.companyResearchJobs.insertDraftInternal,
          {
            userId,
            title: d.title.trim().slice(0, 140),
            content: d.content.trim().slice(0, 4000),
            angle,
          }
        );
        inserted += 1;
      }

      await ctx.runMutation(internal.companyResearchJobs.markJobDone, {
        jobId,
        draftCount: inserted,
      });
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.error(`[companyResearch.generateDraftsForUser] ${jobId}: ${msg}`);
      // Don't rethrow — research failure must not block the rest of
      // onboarding, and retry is the user's call via the "Retry research"
      // button on the review queue.
      await ctx.runMutation(
        internal.companyResearchJobs.markJobFailed,
        { jobId, error: msg }
      );
    }
  },
});
