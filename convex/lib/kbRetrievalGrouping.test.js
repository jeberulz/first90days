import { describe, it, expect } from "vitest";
import { groupResultsByDocument } from "./kbRetrievalGrouping.js";

/**
 * Shape fixture: mirrors what rag.search returns. Lets tests build
 * search-result inputs without repeating the envelope.
 */
function makeSearchResult({ results, entries }) {
  return { results, entries, text: "", usage: { tokens: 0 } };
}

describe("groupResultsByDocument", () => {
  it("returns an empty array for an empty search result", () => {
    expect(
      groupResultsByDocument({
        searchResult: makeSearchResult({ results: [], entries: [] }),
        maxPerDoc: 2,
        maxDocs: 5,
      })
    ).toEqual([]);
  });

  it("groups chunk results by document via entries[].key", () => {
    const entries = [
      { entryId: "e1", key: "doc_a", title: "A" },
      { entryId: "e2", key: "doc_b", title: "B" },
    ];
    const results = [
      {
        entryId: "e1",
        order: 0,
        startOrder: 0,
        score: 0.9,
        content: [
          { text: "alpha chunk", metadata: { chunkIndex: 0, headingPath: "Intro" } },
        ],
      },
      {
        entryId: "e1",
        order: 1,
        startOrder: 1,
        score: 0.8,
        content: [
          { text: "beta chunk", metadata: { chunkIndex: 1, headingPath: "Intro › Sub" } },
        ],
      },
      {
        entryId: "e2",
        order: 0,
        startOrder: 0,
        score: 0.7,
        content: [
          { text: "gamma chunk", metadata: { chunkIndex: 0, headingPath: "" } },
        ],
      },
    ];
    const citations = groupResultsByDocument({
      searchResult: makeSearchResult({ results, entries }),
      maxPerDoc: 2,
      maxDocs: 5,
    });
    expect(citations).toHaveLength(2);
    const a = citations.find((c) => c.documentId === "doc_a");
    expect(a.chunks).toHaveLength(2);
    expect(a.chunks[0].text).toBe("alpha chunk");
    expect(a.chunks[0].headingPath).toEqual(["Intro"]);
    expect(a.chunks[1].headingPath).toEqual(["Intro", "Sub"]);
    expect(a.score).toBe(0.9);
    const b = citations.find((c) => c.documentId === "doc_b");
    expect(b.chunks).toHaveLength(1);
    expect(b.chunks[0].headingPath).toEqual([]);
  });

  it("caps chunks per document to maxPerDoc (highest scoring first)", () => {
    const entries = [{ entryId: "e1", key: "doc_a" }];
    const results = [
      {
        entryId: "e1",
        order: 0,
        startOrder: 0,
        score: 0.5,
        content: [{ text: "low", metadata: { chunkIndex: 0 } }],
      },
      {
        entryId: "e1",
        order: 1,
        startOrder: 1,
        score: 0.9,
        content: [{ text: "high", metadata: { chunkIndex: 1 } }],
      },
      {
        entryId: "e1",
        order: 2,
        startOrder: 2,
        score: 0.7,
        content: [{ text: "mid", metadata: { chunkIndex: 2 } }],
      },
    ];
    const citations = groupResultsByDocument({
      searchResult: makeSearchResult({ results, entries }),
      maxPerDoc: 2,
      maxDocs: 5,
    });
    expect(citations).toHaveLength(1);
    expect(citations[0].chunks.map((c) => c.text)).toEqual(["high", "mid"]);
  });

  it("caps total docs to maxDocs, ordered by best-chunk score", () => {
    const entries = [
      { entryId: "e1", key: "doc_a" },
      { entryId: "e2", key: "doc_b" },
      { entryId: "e3", key: "doc_c" },
    ];
    const results = [
      { entryId: "e1", order: 0, startOrder: 0, score: 0.2, content: [{ text: "a" }] },
      { entryId: "e2", order: 0, startOrder: 0, score: 0.9, content: [{ text: "b" }] },
      { entryId: "e3", order: 0, startOrder: 0, score: 0.5, content: [{ text: "c" }] },
    ];
    const citations = groupResultsByDocument({
      searchResult: makeSearchResult({ results, entries }),
      maxPerDoc: 1,
      maxDocs: 2,
    });
    expect(citations.map((c) => c.documentId)).toEqual(["doc_b", "doc_c"]);
  });

  it("deduplicates repeat hits on the same chunkIndex within a doc", () => {
    const entries = [{ entryId: "e1", key: "doc_a" }];
    const results = [
      {
        entryId: "e1",
        order: 0,
        startOrder: 0,
        score: 0.9,
        content: [{ text: "first hit", metadata: { chunkIndex: 0 } }],
      },
      {
        entryId: "e1",
        order: 1,
        startOrder: 1,
        score: 0.7,
        content: [{ text: "dup hit", metadata: { chunkIndex: 0 } }],
      },
    ];
    const citations = groupResultsByDocument({
      searchResult: makeSearchResult({ results, entries }),
      maxPerDoc: 2,
      maxDocs: 5,
    });
    expect(citations[0].chunks).toHaveLength(1);
    expect(citations[0].chunks[0].text).toBe("first hit");
  });

  it("handles results whose entryId is not in entries[]", () => {
    // Shouldn't happen in practice but we want a defensive test.
    const entries = [];
    const results = [
      { entryId: "e_orphan", order: 0, startOrder: 0, score: 0.5, content: [{ text: "x" }] },
    ];
    expect(
      groupResultsByDocument({
        searchResult: makeSearchResult({ results, entries }),
        maxPerDoc: 2,
        maxDocs: 5,
      })
    ).toEqual([]);
  });

  it("accepts array-shaped headingPath metadata", () => {
    const entries = [{ entryId: "e1", key: "doc_a" }];
    const results = [
      {
        entryId: "e1",
        order: 0,
        startOrder: 0,
        score: 0.8,
        content: [
          {
            text: "t",
            metadata: { chunkIndex: 0, headingPath: ["Top", "Sub"] },
          },
        ],
      },
    ];
    const c = groupResultsByDocument({
      searchResult: makeSearchResult({ results, entries }),
      maxPerDoc: 1,
      maxDocs: 5,
    });
    expect(c[0].chunks[0].headingPath).toEqual(["Top", "Sub"]);
  });

  it("joins multi-part result content windows into one chunk text", () => {
    // chunkContext: { before, after } > 0 would surface multiple entries
    // in content[]. We concatenate them with double newlines.
    const entries = [{ entryId: "e1", key: "doc_a" }];
    const results = [
      {
        entryId: "e1",
        order: 5,
        startOrder: 4,
        score: 0.6,
        content: [
          { text: "before", metadata: { chunkIndex: 4 } },
          { text: "match", metadata: { chunkIndex: 5 } },
          { text: "after", metadata: { chunkIndex: 6 } },
        ],
      },
    ];
    const [c] = groupResultsByDocument({
      searchResult: makeSearchResult({ results, entries }),
      maxPerDoc: 1,
      maxDocs: 5,
    });
    expect(c.chunks[0].text).toBe("before\n\nmatch\n\nafter");
    // chunkIndex comes from the first content entry's metadata
    expect(c.chunks[0].chunkIndex).toBe(4);
  });
});
