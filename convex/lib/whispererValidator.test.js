/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { validateResponse } from "./whispererValidator.js";

function fakeJudge(verdict) {
  return async () => ({ json: verdict });
}

describe("validateResponse", () => {
  it("short-circuits ok=true when no stakeholder facts are supplied", async () => {
    const out = await validateResponse(
      { coaching_summary: "Whatever I want to say." },
      null,
      fakeJudge({ ok: false, reason: "x", fabricated: ["x"] })
    );
    expect(out.ok).toBe(true);
  });

  it("returns the judge verdict when facts are supplied", async () => {
    const judge = fakeJudge({
      ok: false,
      reason: "Invented Marcus's tenure.",
      fabricated: ["Marcus has been there 5 years"],
    });
    const out = await validateResponse(
      { coaching_summary: "Marcus has been there 5 years..." },
      { name: "Marcus", role: "PM" },
      judge
    );
    expect(out.ok).toBe(false);
    expect(out.fabricated).toContain("Marcus has been there 5 years");
  });

  it("treats a thrown judge call as not-ok with judge_unavailable reason", async () => {
    const judge = async () => {
      throw new Error("network");
    };
    const out = await validateResponse(
      { coaching_summary: "Hello" },
      { name: "Marcus" },
      judge
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/judge_unavailable/);
  });

  it("normalises a missing fabricated array to []", async () => {
    const out = await validateResponse(
      { coaching_summary: "Hello" },
      { name: "Marcus" },
      fakeJudge({ ok: true })
    );
    expect(out.ok).toBe(true);
    expect(out.fabricated).toEqual([]);
  });
});
