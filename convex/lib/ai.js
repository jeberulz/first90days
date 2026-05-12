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

// Default Sonnet model id. Pinned in one place so swapping versions in
// future cuts only happens here.
export const CLAUDE_SONNET_MODEL = "claude-sonnet-4-20250514";
// Cheap Haiku id used by the structured judge + U5's semantic
// classifier. The prior pin (claude-3-5-haiku-20241022) hit EOL on
// 2026-02-19; the current release is Haiku 4.5.
export const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";

async function callClaude(systemPrompt, userPrompt) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: CLAUDE_SONNET_MODEL,
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

/**
 * Forced-structured-output helper. Bifurcated from generateText so we
 * can use Anthropic's tool_use forced JSON path or OpenAI's
 * response_format json_schema. The caller passes a `schema` shaped like
 * `convex/lib/whispererPrompts.HYBRID_RESPONSE_SCHEMA`:
 *   { name, description, input_schema: <JSONSchema> }
 *
 * Returns:
 *   {
 *     json:   <parsed object matching the schema>,
 *     raw:    <stringified JSON the provider produced>,
 *     model:  <model id used>,
 *     tokens: { input, output },
 *     latencyMs,
 *   }
 *
 * On parse failure throws Error("structured_parse_failed: …") so the
 * caller can retry once with a stricter prompt (U4 step 7).
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{name:string, description?:string, input_schema:object}} schema
 * @param {{model?:string, maxTokens?:number}} [options]
 */
export async function generateStructured(systemPrompt, userPrompt, schema, options = {}) {
  const provider = getProvider();
  const start = Date.now();
  if (provider === "openai") {
    const json = await callOpenAIStructured(systemPrompt, userPrompt, schema, options);
    return {
      json: json.parsed,
      raw: json.raw,
      model: json.model,
      tokens: json.tokens,
      latencyMs: Date.now() - start,
    };
  }
  const result = await callClaudeStructured(systemPrompt, userPrompt, schema, options);
  return {
    json: result.parsed,
    raw: result.raw,
    model: result.model,
    tokens: result.tokens,
    latencyMs: Date.now() - start,
  };
}

async function callClaudeStructured(systemPrompt, userPrompt, schema, options) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = options.model || CLAUDE_SONNET_MODEL;
  const maxTokens = options.maxTokens || 4096;

  const tool = {
    name: schema.name,
    description: schema.description || "",
    input_schema: schema.input_schema,
  };

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: "tool", name: schema.name },
    messages: [{ role: "user", content: userPrompt }],
  });

  // tool_choice forces the model to emit a single tool_use block.
  const block = (response.content || []).find((c) => c.type === "tool_use");
  if (!block || !block.input) {
    throw new Error(
      `structured_parse_failed: model returned no tool_use block (provider=claude, model=${model})`
    );
  }

  return {
    parsed: block.input,
    raw: JSON.stringify(block.input),
    model,
    tokens: {
      input: response.usage?.input_tokens ?? 0,
      output: response.usage?.output_tokens ?? 0,
    },
  };
}

async function callOpenAIStructured(systemPrompt, userPrompt, schema, options) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = options.model || "gpt-4o-2024-08-06";
  const maxTokens = options.maxTokens || 4096;

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        description: schema.description || "",
        schema: schema.input_schema,
        strict: true,
      },
    },
  });

  const raw = response.choices[0].message.content || "";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `structured_parse_failed: provider=openai, JSON.parse error: ${e.message}`
    );
  }

  return {
    parsed,
    raw,
    model,
    tokens: {
      input: response.usage?.prompt_tokens ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
  };
}

/**
 * Lightweight Haiku judge for short structured-output checks
 * (whisperer PII validator + U5's semantic classifier). Same
 * signature as generateStructured but pinned to Haiku.
 */
export async function judgeWithHaiku(systemPrompt, userPrompt, schema, options = {}) {
  return generateStructured(systemPrompt, userPrompt, schema, {
    ...options,
    model: options.model || CLAUDE_HAIKU_MODEL,
    maxTokens: options.maxTokens || 1024,
  });
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
