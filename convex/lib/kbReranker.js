/**
 * Pure helper that re-ranks hydrated KB citations using three signals:
 *   1. Vector similarity (the score we already got from rag.search)
 *   2. Document importance (0..100, stored on kbDocuments — bumped manually
 *      or by the enrichment LLM for high-value docs like strategy memos)
 *   3. Recency (exponential decay on document age, half-life in days)
 *
 * Kept in its own file — no Convex ctx, no RAG client, no OpenAI SDK — so
 * it's unit-testable without touching the runtime. kbContext.js (node
 * runtime) calls it after hydrating citations from kbDocuments.
 *
 * Scoring formula (see kbRetrievalConfig.js for the knob semantics):
 *
 *   normImportance = (importance ?? 50) / 100
 *   recencyBonus   = 0.5 ^ (ageDays / halflife)
 *   final          = (1 - wImp) * similarity
 *                  +       wImp * normImportance
 *                  +       wRec * recencyBonus
 *
 * `similarity` is clamped to [0, 1] so docs with negative scores (which
 * shouldn't happen in cosine space but we defend against it) can't drag
 * the blended score negative.
 */

/**
 * @param {Object} args
 * @param {Array<Object>} args.citations - hydrated citations (need `score`,
 *     `importance`, `_creationTime` — the latter two come from joining
 *     kbDocuments metadata into the grouping helper output).
 * @param {number} args.nowMs - injected clock so tests are deterministic.
 * @param {number} args.importanceWeight - 0..1. 0 = pure similarity.
 * @param {number} args.recencyWeight - additive weight for recency bonus.
 * @param {number} args.recencyHalflifeDays - half-life of the recency decay.
 * @param {number} args.maxDocs - final cap after re-rank.
 * @returns {Array<Object>} new array, sorted by blended score desc.
 */
export function rerankCitations({
  citations,
  nowMs,
  importanceWeight,
  recencyWeight,
  recencyHalflifeDays,
  maxDocs,
}) {
  if (!Array.isArray(citations) || citations.length === 0) return [];

  const wImp = clamp01(importanceWeight ?? 0);
  const wRec = Math.max(0, recencyWeight ?? 0);
  const halflife = Math.max(1, recencyHalflifeDays ?? 30);

  const scored = citations.map((c) => {
    const similarity = clamp01(c.score ?? 0);

    // importance is optional (undefined on legacy docs). Treat missing as
    // neutral (50) so it never punishes a doc we simply haven't scored.
    const rawImportance = typeof c.importance === "number" ? c.importance : 50;
    const normImportance = clamp01(rawImportance / 100);

    const createdAt =
      typeof c.createdAt === "number"
        ? c.createdAt
        : typeof c._creationTime === "number"
          ? c._creationTime
          : nowMs; // unknown age = treat as brand-new (recencyBonus ~= 1)
    const ageDays = Math.max(0, (nowMs - createdAt) / (1000 * 60 * 60 * 24));
    const recencyBonus = Math.pow(0.5, ageDays / halflife);

    const final =
      (1 - wImp) * similarity + wImp * normImportance + wRec * recencyBonus;

    return {
      ...c,
      rerank: {
        similarity,
        normImportance,
        recencyBonus,
        ageDays,
        final,
      },
      // Overwrite the top-level score so downstream consumers
      // (semanticSearch display, prompt block ordering) see the blended
      // value. The pre-rerank similarity is preserved under `rerank`.
      score: final,
    };
  });

  scored.sort((a, b) => b.rerank.final - a.rerank.final);
  return scored.slice(0, maxDocs);
}

function clamp01(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
