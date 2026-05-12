/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { validateResponse, shouldValidate } from "./whispererValidator.js";

function fakeJudge(verdict) {
  return async () => ({ json: verdict });
}

describe("shouldValidate", () => {
  it("returns false when no stakeholder is linked", () => {
    expect(shouldValidate({ artifact: "Hi Marcus" }, null)).toBe(false);
  });

  it("returns false when facts are present but no artifact text", () => {
    expect(
      shouldValidate(
        { coaching_summary: "Generic advice", artifact: "" },
        { name: "Marcus" }
      )
    ).toBe(false);
  });

  it("returns true when artifact text exists AND stakeholder has facts", () => {
    expect(
      shouldValidate(
        { artifact: "Hi Marcus — looking forward to it." },
        { name: "Marcus", role: "PM" }
      )
    ).toBe(true);
  });

  it("returns false when stakeholderFacts is present but empty", () => {
    expect(
      shouldValidate({ artifact: "Hi" }, { name: null, role: null })
    ).toBe(false);
  });
});

describe("validateResponse", () => {
  it("short-circuits ok=true when no stakeholder facts are supplied", async () => {
    const out = await validateResponse(
      { coaching_summary: "Whatever I want to say.", artifact: "Hi Marcus" },
      null,
      fakeJudge({ ok: false, reason: "x", fabricated: ["x"] })
    );
    expect(out.ok).toBe(true);
  });

  it("short-circuits ok=true with skipped reason when no artifact text", async () => {
    const out = await validateResponse(
      { coaching_summary: "Marcus has been there 5 years.", artifact: "" },
      { name: "Marcus", role: "PM" },
      fakeJudge({ ok: false })
    );
    expect(out.ok).toBe(true);
    expect(out.reason).toBe("skipped_no_artifact");
  });

  it("returns the judge verdict when an artifact is present and facts exist", async () => {
    const judge = fakeJudge({
      ok: false,
      reason: "Invented Marcus's tenure.",
      fabricated: ["Marcus has been there 5 years"],
    });
    const out = await validateResponse(
      { artifact: "Hi Marcus — given you've been there 5 years, lean in." },
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
      { artifact: "Hi Marcus — quick agenda." },
      { name: "Marcus" },
      judge
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/judge_unavailable/);
  });

  it("normalises a missing fabricated array to []", async () => {
    const out = await validateResponse(
      { artifact: "Hi Marcus" },
      { name: "Marcus" },
      fakeJudge({ ok: true })
    );
    expect(out.ok).toBe(true);
    expect(out.fabricated).toEqual([]);
  });
});
