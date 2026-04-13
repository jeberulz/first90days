import { describe, it, expect } from "vitest";
import { rerankCitations } from "./kbReranker.js";

/**
 * A tiny factory that builds citation fixtures without repeating the
 * envelope. Only the fields rerankCitations reads are filled in.
 */
function makeCitation(overrides = {}) {
  return {
    documentId: "doc",
    score: 0.5,
    importance: 50,
    _creationTime: 0,
    chunks: [],
    ...overrides,
  };
}

const DAY_MS = 1000 * 60 * 60 * 24;

describe("rerankCitations", () => {
  it("returns an empty array for empty input", () => {
    expect(
      rerankCitations({
        citations: [],
        nowMs: 0,
        importanceWeight: 0.25,
        recencyWeight: 0.05,
        recencyHalflifeDays: 30,
        maxDocs: 5,
      })
    ).toEqual([]);
  });

  it("is a pure identity sort when importanceWeight=0 and recencyWeight=0", () => {
    const citations = [
      makeCitation({ documentId: "a", score: 0.2 }),
      makeCitation({ documentId: "b", score: 0.9 }),
      makeCitation({ documentId: "c", score: 0.5 }),
    ];
    const out = rerankCitations({
      citations,
      nowMs: 0,
      importanceWeight: 0,
      recencyWeight: 0,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    expect(out.map((c) => c.documentId)).toEqual(["b", "c", "a"]);
  });

  it("promotes a high-importance doc over a higher-similarity low-importance doc", () => {
    // With wImp=0.5, a 0.5 similarity + 100 importance doc (final=0.75)
    // beats a 0.9 similarity + 0 importance doc (final=0.45). Recency off
    // so we test importance alone.
    const citations = [
      makeCitation({ documentId: "highSim", score: 0.9, importance: 0 }),
      makeCitation({ documentId: "highImp", score: 0.5, importance: 100 }),
    ];
    const out = rerankCitations({
      citations,
      nowMs: 0,
      importanceWeight: 0.5,
      recencyWeight: 0,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    expect(out[0].documentId).toBe("highImp");
    expect(out[1].documentId).toBe("highSim");
  });

  it("applies recency bonus via exponential decay at the half-life", () => {
    const now = 100 * DAY_MS;
    const citations = [
      // Same similarity, same importance — only age differs.
      makeCitation({ documentId: "fresh", score: 0.5, _creationTime: now }),
      makeCitation({
        documentId: "old",
        score: 0.5,
        _creationTime: now - 30 * DAY_MS,
      }),
    ];
    const out = rerankCitations({
      citations,
      nowMs: now,
      importanceWeight: 0,
      recencyWeight: 0.1,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    expect(out[0].documentId).toBe("fresh");
    // Fresh: bonus = 1.0, old: bonus = 0.5 → diff = 0.1 * 0.5 = 0.05
    const diff = out[0].rerank.final - out[1].rerank.final;
    expect(diff).toBeCloseTo(0.05, 5);
  });

  it("treats missing importance as neutral (50)", () => {
    const citations = [
      makeCitation({ documentId: "neutral", score: 0.5, importance: undefined }),
      makeCitation({ documentId: "explicit50", score: 0.5, importance: 50 }),
    ];
    const out = rerankCitations({
      citations,
      nowMs: 0,
      importanceWeight: 0.5,
      recencyWeight: 0,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    expect(out[0].rerank.final).toBeCloseTo(out[1].rerank.final, 6);
  });

  it("clamps negative similarity scores to 0", () => {
    const citations = [
      makeCitation({ documentId: "neg", score: -0.3, importance: 100 }),
    ];
    const out = rerankCitations({
      citations,
      nowMs: 0,
      importanceWeight: 0.5,
      recencyWeight: 0,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    // 0.5 * 0 + 0.5 * 1 = 0.5
    expect(out[0].rerank.similarity).toBe(0);
    expect(out[0].rerank.final).toBeCloseTo(0.5, 6);
  });

  it("caps output to maxDocs", () => {
    const citations = [
      makeCitation({ documentId: "a", score: 0.9 }),
      makeCitation({ documentId: "b", score: 0.8 }),
      makeCitation({ documentId: "c", score: 0.7 }),
      makeCitation({ documentId: "d", score: 0.6 }),
    ];
    const out = rerankCitations({
      citations,
      nowMs: 0,
      importanceWeight: 0,
      recencyWeight: 0,
      recencyHalflifeDays: 30,
      maxDocs: 2,
    });
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.documentId)).toEqual(["a", "b"]);
  });

  it("preserves pre-rerank similarity under `rerank.similarity`", () => {
    const citations = [makeCitation({ score: 0.42, importance: 80 })];
    const [out] = rerankCitations({
      citations,
      nowMs: 0,
      importanceWeight: 0.5,
      recencyWeight: 0,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    expect(out.rerank.similarity).toBeCloseTo(0.42, 6);
    expect(out.score).not.toBeCloseTo(0.42, 3); // was rewritten
  });

  it("does not mutate the input citations", () => {
    const citations = [makeCitation({ documentId: "a", score: 0.5 })];
    const snapshot = JSON.parse(JSON.stringify(citations));
    rerankCitations({
      citations,
      nowMs: 0,
      importanceWeight: 0.5,
      recencyWeight: 0.1,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    expect(citations).toEqual(snapshot);
  });

  it("defaults unknown createdAt to nowMs (recencyBonus = 1)", () => {
    const citations = [
      makeCitation({ documentId: "nots", score: 0.5, _creationTime: undefined }),
    ];
    const out = rerankCitations({
      citations,
      nowMs: 1000,
      importanceWeight: 0,
      recencyWeight: 0.1,
      recencyHalflifeDays: 30,
      maxDocs: 5,
    });
    expect(out[0].rerank.recencyBonus).toBeCloseTo(1, 6);
  });
});
