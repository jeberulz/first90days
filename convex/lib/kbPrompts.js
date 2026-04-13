/**
 * KB prompt + context-block formatters.
 *
 * Pure JS, no "use node". Imported by:
 *   - convex/lib/kbContext.js (prompt assembly)
 *   - convex/kbPipeline.js    (enrichment system prompt)
 */

import { KB_CATEGORY_LABELS } from "./kbCategories.js";

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
