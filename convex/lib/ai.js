import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

function getProvider() {
  return process.env.AI_PROVIDER || "claude";
}

// Embeddings are pinned to OpenAI text-embedding-3-small (1536d) regardless
// of AI_PROVIDER. Anthropic doesn't ship embeddings, and switching providers
// later would require re-embedding every kbDocument. Generation stays
// pluggable via AI_PROVIDER; embeddings do not.
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;

let _openaiClient = null;
function openaiClient() {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

/**
 * Embed a single piece of text. Returns a Float32 array of 1536 dimensions.
 * Used by KB memory consolidation for one-off similarity checks; bulk
 * embedding flows through @convex-dev/rag instead.
 */
export async function embedText(input) {
  const text = (input || "").toString();
  if (!text.trim()) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }
  const client = openaiClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

async function callClaude(systemPrompt, userPrompt) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  return response.content[0].text;
}

async function callOpenAI(systemPrompt, userPrompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response.choices[0].message.content;
}

export async function generateText(systemPrompt, userPrompt) {
  const provider = getProvider();
  if (provider === "openai") {
    return callOpenAI(systemPrompt, userPrompt);
  }
  return callClaude(systemPrompt, userPrompt);
}

export const WATKINS_SYSTEM_PROMPT = `You are an expert career coach specializing in Michael Watkins' "The First 90 Days" framework. You help professionals plan their transition into new roles.

Key principles from the framework:
- STARS model: Startup, Turnaround, Accelerated Growth, Realignment, Sustaining Success
- Three phases: Learn (days 1-30), Contribute (days 31-60), Lead (days 61-90)
- Focus areas: Technical learning, building relationships, achieving early wins, aligning expectations

When generating plans:
- Create specific, actionable activities (not vague platitudes)
- Each activity needs: title, description, category (learning/shipping/relationships/influence), time estimate, priority (High/Medium/Low), and a scheduled day number (1-90)
- Distribute activities across all 90 days with ~5-7 per week
- Phase 1 (Learn): Heavy on learning, stakeholder meetings, understanding context
- Phase 2 (Contribute): Balance of delivering value and building relationships
- Phase 3 (Lead): Focus on influence, strategic initiatives, mentoring

Always respond with valid JSON when asked to generate structured data.`;

export const ACTIVITY_SUGGESTION_PROMPT = `Based on the user's current context, suggest 1-3 specific activities they should consider. Each suggestion should be:
- Directly relevant to their current phase and recent activity
- Actionable within the next 1-2 days
- Varied in category (don't suggest all the same type)

Respond with a JSON array of objects with: title, description, category (learning/shipping/relationships/influence), estimatedTime, priority (High/Medium/Low).`;

export const WEEKLY_INSIGHT_PROMPT = `Analyze the user's week and provide 2-3 sentences of actionable insight. Consider:
- Their completion rate and patterns
- Balance across categories (learning, shipping, relationships, influence)
- Stakeholder engagement patterns
- Any areas that need attention

Be specific and constructive, not generic. Reference specific data points from their week.`;
