/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import {
  WHISPERER_FALLBACK_TIPS,
  pickFallbackTip,
} from "./whispererFallbacks.js";

describe("WHISPERER_FALLBACK_TIPS", () => {
  it("has a default pool", () => {
    expect(Array.isArray(WHISPERER_FALLBACK_TIPS.default)).toBe(true);
    expect(WHISPERER_FALLBACK_TIPS.default.length).toBeGreaterThan(0);
  });

  it("covers the four primary task categories", () => {
    for (const k of ["learning", "shipping", "relationships", "influence"]) {
      expect(Array.isArray(WHISPERER_FALLBACK_TIPS[k])).toBe(true);
      expect(WHISPERER_FALLBACK_TIPS[k].length).toBeGreaterThanOrEqual(2);
    }
  });

  it("contains at least 12 tips across all categories", () => {
    const total = Object.values(WHISPERER_FALLBACK_TIPS).reduce(
      (n, arr) => n + arr.length,
      0
    );
    expect(total).toBeGreaterThanOrEqual(12);
  });
});

describe("pickFallbackTip", () => {
  it("returns a tip from the matching category", () => {
    const out = pickFallbackTip("learning", 0);
    expect(WHISPERER_FALLBACK_TIPS.learning).toContain(out.tip);
    expect(out.category).toBe("learning");
  });

  it("falls back to default when the category is unknown", () => {
    const out = pickFallbackTip("not-a-real-category", 0);
    expect(out.category).toBe("default");
    expect(WHISPERER_FALLBACK_TIPS.default).toContain(out.tip);
  });

  it("falls back to default when category is null/undefined", () => {
    expect(pickFallbackTip(null, 0).category).toBe("default");
    expect(pickFallbackTip(undefined, 0).category).toBe("default");
  });

  it("rotates across the pool as the seed advances", () => {
    const pool = WHISPERER_FALLBACK_TIPS.learning;
    const seen = new Set();
    for (let i = 0; i < pool.length; i++) {
      const { tip } = pickFallbackTip("learning", i * 60000);
      seen.add(tip);
    }
    expect(seen.size).toBe(pool.length);
  });
});
