/**
 * KB prompt + context-block formatters.
 *
 * Pure JS, no "use node". Imported by:
 *   - convex/lib/kbContext.js (prompt assembly)
 *   - convex/kbPipeline.js    (enrichment system prompt)
 */

import { KB_CATEGORY_LABELS } from "./kbCategories.js";
import { GOAL_THEME_LABELS } from "./planPrompts.js";

export const KB_CONTEXT_HEADER = "## Context I know about you";

const FOOTER =
  "Use this context when relevant, but don't quote it verbatim. " +
  "If a piece of context contradicts the user's current question, prefer the question.";

/**
 * Format the markdown context block injected into AI system prompts.
 *
 * @param {Object} args
 * @param {Array} args.memories - kbMemories rows ({text, type, confidence, source labels})
 * @param {Array} args.entries  - rag.search "entries" array, joined with kbDocuments
 * @returns {string} ready-to-prepend markdown block
 */
export function formatContextBlock({ memories = [], entries = [] }) {
  const lines = [KB_CONTEXT_HEADER, ""];

  if (memories.length > 0) {
    lines.push("### Active memories (high-signal facts)");
    for (const m of memories) {
      const conf = m.confidence !== undefined
        ? ` (confidence ${m.confidence.toFixed(2)})`
        : "";
      lines.push(`- [${m.type}] ${m.text}${conf}`);
    }
    lines.push("");
  }

  if (entries.length > 0) {
    lines.push("### Relevant documents");
    for (const e of entries) {
      const cat = e.category ? KB_CATEGORY_LABELS[e.category] || e.category : null;
      const sourceType = e.sourceType ? `, ${e.sourceType}` : "";
      const meta = cat ? `(${cat}${sourceType})` : sourceType ? `(${sourceType.slice(2)})` : "";
      lines.push(`- **${e.title || "(untitled)"}** ${meta}`.trim());
      if (e.summary) lines.push(`  summary: ${e.summary}`);
      if (e.keyFacts && e.keyFacts.length > 0) {
        lines.push(`  key facts: ${e.keyFacts.slice(0, 5).join("; ")}`);
      } else if (e.snippet) {
        lines.push(`  snippet: ${e.snippet.slice(0, 280)}`);
      }
    }
    lines.push("");
  }

  if (memories.length === 0 && entries.length === 0) {
    return ""; // Nothing to inject
  }

  lines.push(FOOTER);
  return lines.join("\n");
}

/**
 * Rough token estimate. 1 token ≈ 4 chars for English. Used by callers
 * to decide whether to truncate.
 */
export function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

/**
 * The strict-JSON enrichment contract. Used by kbPipeline.runEnrich (M2).
 */
export const ENRICHMENT_SYSTEM_PROMPT = `You are an information extraction assistant for a personalized 90-day onboarding tool. Given a user's source document, you produce a structured JSON summary that helps an AI coach personalize the user's plan.

You MUST respond with ONLY valid JSON, no prose, no code fences. The JSON must match this exact shape:

{
  "summary": "1 paragraph (2-4 sentences) summarizing the document",
  "keyFacts": ["bullet 1", "bullet 2", "bullet 3"],
  "categoryPrediction": "one of: company_context | team_people | product_technology | processes_workflows | goals_notes | industry_market",
  "categoryConfidence": 0.0,
  "importance": 0,
  "memoryCandidates": [
    {
      "text": "1-2 sentence atomic insight",
      "type": "behavioral | people | technical | goal | process | cultural",
      "confidence": 0.0,
      "entityType": "stakeholder | goal | company | team | product | none",
      "entityName": "(human-readable name if entityType is stakeholder, otherwise empty)",
      "supportingChunks": [0]
    }
  ]
}

Rules:
- keyFacts: 3-7 short bullets, each a concrete fact a coach should know.
- categoryConfidence: a float 0..1; only auto-set the category if > 0.7.
- importance: integer 0..100. 90+ for company strategy / executive context. 30-50 for routine notes.
- memoryCandidates: 0-5 items. Each must be atomic and durable (not a one-off observation). Confidence 0..1.
- entityName for stakeholder memories should be the person's name as it appears in the document.
- Empty arrays are fine; do not invent facts.`;

export function enrichmentUserPrompt(doc) {
  const titleLine = doc.title ? `Title: ${doc.title}\n\n` : "";
  // Cap content to keep token budget sane. Most onboarding docs are < 4k tokens.
  const truncated = (doc.content || "").slice(0, 12000);
  return `${titleLine}Source type: ${doc.sourceType || "unknown"}\nCurrent category: ${doc.category || "uncategorized"}\n\n--- DOCUMENT ---\n${truncated}\n--- END DOCUMENT ---\n\nReturn only the JSON object.`;
}

// ── Company research (Cut 1 — single-shot, no tool use) ──────────────────
//
// After onboarding completes we call generateText once with this system
// prompt and the user's onboardingData + optional job description. The
// model returns a JSON array of 8–10 atomic drafts which become pending
// kbDocuments in the "company_context" category. The user reviews each
// one in the DraftReviewQueue and approves or discards. Approved drafts
// flow through the existing embed → enrich → memory consolidation pipeline.
//
// Cut 2 will replace this with a tool-use agent that can fetch real URLs.
// For Cut 1 the explicit "do not invent facts" guidance is the main
// guardrail against hallucination.

export const COMPANY_RESEARCH_SYSTEM_PROMPT = `You are a research assistant for a 90-day onboarding tool. A new hire has just joined a company. Your job is to produce 8–10 short, atomic knowledge-base drafts that will ground an AI coach's advice for them over the next 90 days.

You MUST respond with ONLY a valid JSON array, no prose, no code fences. Each element must match this exact shape:

{
  "title": "Short concrete title, under 70 characters",
  "content": "150–350 words of plain text. One topic per draft. Write in neutral third-person, not marketing tone. Focus on facts a new hire needs to know.",
  "angle": "one of: mission_values | strategic_priorities | leadership | products_recent | role_summary | role_expectations | stakeholders_implied | culture_signals | industry_position | risks_open_questions"
}

Rules:
- Produce 8–10 drafts. Fewer is fine if the signal is thin; never invent leaders, customers, revenue, or specific numbers that aren't in the inputs.
- Every draft must be ATOMIC: one topic only. A draft about "mission and leadership and products" is wrong — split it.
- Ground everything in the provided onboarding data and job description. Do NOT fabricate executives, customer names, strategic priorities, or metrics that aren't directly supported.
- STARS is a role attribute, not a company attribute. The situation field ("Turnaround", "Startup", "Accelerated Growth", "Realignment", "Sustaining Success") describes the new hire's mandate, not the company's financial state, market position, or strategic phase. Do NOT write drafts that describe the company itself as being in a turnaround, startup phase, realignment, etc. unless that is independently grounded elsewhere in the inputs. A "Turnaround" STARS means the hire is rescuing a project or team — it does not mean the company is struggling.
- Do NOT describe the company's products, customers, executives, funding, or market position unless those details appear verbatim in the provided inputs. Even if the company name is familiar to you from prior knowledge, you must still omit those drafts. Cut 1 has no web access and no citations — a review gate exists for facts, not for guesses. Confident-sounding hallucinations are the worst failure mode here.
- When a job description is provided, produce at least two role-anchored drafts (role_summary and role_expectations) drawn directly from the JD text.
- The "risks_open_questions" draft should surface 2–4 concrete questions the new hire should ask in their first week, drawn from what the onboarding data implies (a Turnaround STARS situation implies different questions than Sustaining Success).
- Tone: grounded, practical, direct. No marketing fluff ("exciting opportunity", "dynamic team", "industry-leading"). No hedging adverbs.
- For Tier 2 angles (culture_signals, industry_position, mission_values, products_recent, leadership) — if you don't have enough grounded signal, omit them. An omitted draft is better than a hallucinated one.
- Do not reference any specific person by name unless that name appears in the inputs.`;

/**
 * Build the user prompt for the single-shot research call. Accepts a flat
 * object sourced from onboardingData. Keeping this pure so it stays testable.
 */
export function companyResearchUserPrompt(input) {
  const {
    companyName,
    roleTitle,
    companySize,
    companyStage,
    industry,
    starsSituation,
    scope,
    teamSize,
    workModel,
    experienceYears,
    isNewTeam,
    reportsTo,
    jobDescription,
  } = input;

  const lines = [];
  lines.push(`Company: ${companyName}`);
  if (industry) lines.push(`Industry: ${industry}`);
  lines.push(`Company size: ${companySize}`);
  lines.push(`Company stage: ${companyStage}`);
  if (workModel) lines.push(`Work model: ${workModel}`);
  lines.push(`Situation (STARS): ${starsSituation}`);
  lines.push("");
  lines.push(`Role: ${roleTitle}`);
  if (typeof experienceYears === "number") {
    lines.push(`Experience: ${experienceYears} years in the role family`);
  }
  if (reportsTo) lines.push(`Reports to: ${reportsTo}`);
  if (teamSize) lines.push(`Team size: ${teamSize}`);
  if (isNewTeam) lines.push(`Note: the team is brand new.`);
  if (scope) lines.push(`Scope: ${scope}`);
  if (input.selectedGoals && input.selectedGoals.length > 0) {
    const goalLabels = input.selectedGoals.map((id) => GOAL_THEME_LABELS[id] || id).join(", ");
    lines.push(`Priority goals: ${goalLabels}`);
  }
  if (input.existingContext) lines.push(`Existing context: ${input.existingContext}`);
  if (input.challenges) lines.push(`Known challenges: ${input.challenges}`);
  if (input.successDefinition) lines.push(`Success definition: ${input.successDefinition}`);

  if (jobDescription && jobDescription.trim()) {
    lines.push("");
    lines.push("--- JOB DESCRIPTION ---");
    // Cap at 8k chars so we stay well under the model context limit.
    lines.push(jobDescription.slice(0, 8000));
    lines.push("--- END JOB DESCRIPTION ---");
  }

  lines.push("");
  lines.push("Return ONLY the JSON array. No prose, no code fences.");
  return lines.join("\n");
}

export const COMPANY_RESEARCH_VALID_ANGLES = [
  "mission_values",
  "strategic_priorities",
  "leadership",
  "products_recent",
  "role_summary",
  "role_expectations",
  "stakeholders_implied",
  "culture_signals",
  "industry_position",
  "risks_open_questions",
];
