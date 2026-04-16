/**
 * Prompt builders for AI-assisted plan generation.
 *
 * The caller (convex/ai.js) owns the Claude / OpenAI round-trip; this
 * module just shapes the text that goes into it. Split out so the
 * prompts can be audited and tweaked without touching the action glue.
 */

const GOAL_THEME_LABELS = {
  relationships: "Build key relationships",
  product_landscape: "Understand the product & tech landscape",
  quick_win: "Deliver a quick win",
  processes: "Define or refine team processes",
  roadmap: "Build a strategic roadmap",
  culture: "Learn the company culture",
};

/**
 * Flatten onboarding data into a bullet list the model can anchor on.
 * Keep it short and dense — Claude handles structured bullets better
 * than long prose.
 */
export function buildUserContext(onboardingData, stakeholders) {
  const selectedGoalsList = (onboardingData.selectedGoals || [])
    .map((id) => GOAL_THEME_LABELS[id] || id)
    .join(", ");

  return `
Role: ${onboardingData.roleTitle}
Company: ${onboardingData.companyName} (${onboardingData.companySize}, ${onboardingData.companyStage})
Role Type: ${onboardingData.roleType}
Function: ${onboardingData.function_}
Scope: ${onboardingData.scope || "Not specified"}
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
${onboardingData.jobDescription ? `Job Description: ${onboardingData.jobDescription.slice(0, 4000)}` : ""}
${stakeholders && stakeholders.length > 0 ? `\nKey Stakeholders:\n${stakeholders.map((s) => `- ${s.name} (${s.role}, ${s.relationshipType}${s.backgroundContext ? ` — ${s.backgroundContext}` : ""})`).join("\n")}` : ""}
`.trim();
}

/**
 * First AI round-trip: produce 5-7 strategic goals + 12 personalised
 * week themes in a single JSON object. Small output, fast to parse,
 * and lets later phase prompts reference goals by index.
 */
export function buildMetaPrompt(userContext) {
  return `Generate the strategic backbone for a 90-day onboarding plan for this professional.

${userContext}

Return ONLY a JSON object with exactly this shape (no markdown fences, no prose):
{
  "goals": [
    {
      "title": "string — concrete outcome, not a platitude",
      "targetPhase": 1 | 2 | 3,
      "category": "learning" | "shipping" | "relationships" | "influence"
    }
  ],
  "weekThemes": [
    "Week 1 theme (3-5 words)",
    "Week 2 theme",
    "... 12 entries total, one per week"
  ]
}

Rules:
- Generate exactly 5 or 6 goals. Each must be specific to this role and STARS situation.
- At least 2 goals must target Phase 1, at least 1 in Phase 2, at least 1 in Phase 3.
- Week themes should evolve from orientation → contribution → ownership and stay under 40 characters each.
- Output exactly 12 week themes.`;
}

/**
 * Per-phase round-trip: produce ~20 activities that reference goals
 * by their index in the meta response.
 */
export function buildPhaseActivityPrompt(userContext, phase, goalSummaries) {
  const goalList = goalSummaries
    .map((g, i) => `  ${i}: [Phase ${g.targetPhase}] ${g.title}`)
    .join("\n");

  return `Generate the activities for Phase ${phase.number} (${phase.name}, days ${phase.startDay}-${phase.endDay}) for this professional.

${userContext}

Goals already drafted for this plan (reference by index when relevant):
${goalList}

Return ONLY a JSON array (no markdown fences, no prose). Each element:
{
  "title": "string — verb-first, specific",
  "description": "string — 1-2 sentences explaining what to do and why",
  "category": "learning" | "shipping" | "relationships" | "influence",
  "estimatedTime": "string (30m, 1h, 2h, etc.)",
  "priority": "High" | "Medium" | "Low",
  "scheduledDay": integer between ${phase.startDay} and ${phase.endDay},
  "goalIndex": integer or null — index of the supported goal, or null if the activity supports none directly
}

Generate exactly 20 activities for this phase. Distribute scheduledDay values roughly evenly across days ${phase.startDay}-${phase.endDay}. Mix all four categories appropriately for the phase (Phase 1 is learning-heavy, Phase 2 balances shipping and relationships, Phase 3 is influence-heavy).`;
}

export const PHASES = [
  { number: 1, name: "Learn", startDay: 1, endDay: 30 },
  { number: 2, name: "Contribute", startDay: 31, endDay: 60 },
  { number: 3, name: "Lead", startDay: 61, endDay: 90 },
];

/**
 * Strip ```json … ``` (or plain ``` … ```) code fences if present, so the
 * JSON extractors below see naked content. We only peel the first matched
 * fence — if the model emits multiple, the surrounding-bracket scanner
 * will still find the outermost JSON value inside.
 */
function stripCodeFences(response) {
  const fenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenceMatch ? fenceMatch[1] : response;
}

/**
 * Walk the string and return the first balanced JSON value of the
 * requested kind ("object" or "array"). Tracks string boundaries (and
 * escapes) so braces inside string literals don't corrupt the depth
 * counter. More forgiving than a greedy regex when the model emits
 * stray { } in surrounding prose.
 */
function findBalancedJson(input, kind) {
  const open = kind === "object" ? "{" : "[";
  const close = kind === "object" ? "}" : "]";
  for (let start = 0; start < input.length; start++) {
    if (input[start] !== open) continue;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < input.length; i++) {
      const ch = input[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return input.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Pull a JSON object out of a model response that may have leading /
 * trailing prose or markdown fences. Uses a string-aware balanced scan
 * so prose with stray braces doesn't break parsing.
 */
export function extractJsonObject(response) {
  if (!response || typeof response !== "string") return null;
  const cleaned = stripCodeFences(response);
  const candidate = findBalancedJson(cleaned, "object");
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * Pull a JSON array out of a model response. Uses a string-aware
 * balanced scan so prose with stray brackets doesn't break parsing.
 */
export function extractJsonArray(response) {
  if (!response || typeof response !== "string") return null;
  const cleaned = stripCodeFences(response);
  const candidate = findBalancedJson(cleaned, "array");
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}
