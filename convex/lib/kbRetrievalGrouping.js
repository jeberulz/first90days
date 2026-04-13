/**
 * Pure helper for turning chunk-level RAG search results into per-document
 * citations. Kept in its own file (no "use node") so it can be unit tested
 * independently of the RAG client and OpenAI SDK that kbContext.js pulls in.
 *
 * The grouping contract:
 *   - Each `SearchResult` from rag.search represents one chunk window and
 *     carries an `entryId`. In our ingestion pipeline one RAG entry
 *     corresponds to one kbDocument (keyed on kbDocument._id).
 *   - `searchResult.entries[]` is deduped by entryId and exposes the
 *     user-facing `key` (= documentId).
 *   - We want: for each document, the top `maxPerDoc` chunks by score,
 *     returning up to `maxDocs` total documents ordered by best-chunk
 *     score desc.
 *
 * Returns citation objects with an empty metadata footprint (`title`,
 * `summary`, etc. are null). The caller joins those fields in from
 * kbDocuments — keeping this helper free of a Convex ctx dependency.
 */

export function groupResultsByDocument({ searchResult, maxPerDoc, maxDocs }) {
  const results = searchResult?.results ?? [];
  const entries = searchResult?.entries ?? [];

  // entryId → documentId (= entry.key) lookup table.
  const entryKeyById = {};
  for (const e of entries) {
    if (e.entryId && e.key) entryKeyById[e.entryId] = e.key;
  }

  // Accumulate per-document chunk hits.
  const perDoc = new Map();
  for (const r of results) {
    const documentId = entryKeyById[r.entryId];
    if (!documentId) continue;
    const text = (r.content || [])
      .map((c) => c.text)
      .filter(Boolean)
      .join("\n\n");
    if (!text) continue;
    const metadata = r.content?.[0]?.metadata ?? {};
    const chunkIndex =
      typeof metadata.chunkIndex === "number" ? metadata.chunkIndex : r.order;
    const headingPathRaw = metadata.headingPath;
    const headingPath =
      typeof headingPathRaw === "string" && headingPathRaw.length > 0
        ? headingPathRaw.split(" › ")
        : Array.isArray(headingPathRaw)
          ? headingPathRaw
          : [];
    const chunkHit = {
      chunkIndex,
      text,
      headingPath,
      score: r.score ?? null,
    };
    if (!perDoc.has(documentId)) {
      perDoc.set(documentId, {
        documentId,
        ragEntryId: r.entryId,
        bestScore: r.score ?? 0,
        chunks: [chunkHit],
      });
    } else {
      const slot = perDoc.get(documentId);
      slot.chunks.push(chunkHit);
      if ((r.score ?? 0) > slot.bestScore) slot.bestScore = r.score ?? 0;
    }
  }

  // Cap chunks-per-doc (by score) and dedupe by chunkIndex so we don't ever
  // return the same chunk twice from the same document.
  const citations = Array.from(perDoc.values()).map((slot) => {
    const seen = new Set();
    const deduped = [];
    slot.chunks
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .forEach((c) => {
        if (seen.has(c.chunkIndex)) return;
        seen.add(c.chunkIndex);
        deduped.push(c);
      });
    return {
      documentId: slot.documentId,
      ragEntryId: slot.ragEntryId,
      title: null,
      sourceType: null,
      category: null,
      summary: null,
      keyFacts: null,
      chunks: deduped.slice(0, maxPerDoc),
      // Convenience: doc-level score = best chunk score
      score: slot.bestScore,
    };
  });

  citations.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return citations.slice(0, maxDocs);
}
