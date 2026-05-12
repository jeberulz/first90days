/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = {
  ...import.meta.glob("./**/*.js"),
  ...import.meta.glob("./**/*.ts"),
};

/**
 * Public action tests.
 *
 * The happy-path tests for the full hybrid + clarify + small paths
 * require live AI provider calls (Anthropic Sonnet for structured
 * output + Haiku for the PII judge). Those land in U9's fixture-based
 * eval suite where they belong; here we cover the parts that don't
 * depend on a real provider: the auth boundary and the typed
 * `unauthorized` envelope.
 */
describe("whisperer.respond", () => {
  it("returns { status: 'unauthorized' } when no caller identity is bound", async () => {
    const t = convexTest(schema, modules);
    // No t.withIdentity() — auth.getUserId resolves to null.
    // We still need an activityId arg that passes the validator; the
    // action short-circuits before reading it.
    const fakeActivityId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "u@example.com" });
      const planId = await ctx.db.insert("plans", {
        userId,
        status: "active",
        overallCompletion: 0,
      });
      const phaseId = await ctx.db.insert("phases", {
        planId,
        userId,
        number: 1,
        name: "P1",
        startDay: 1,
        endDay: 30,
        milestone: "ms",
        status: "active",
      });
      const weekId = await ctx.db.insert("weeks", {
        planId,
        phaseId,
        userId,
        number: 1,
        theme: "t",
        reflectionPrompt: "r",
        reviewQuestions: [],
      });
      return await ctx.db.insert("activities", {
        planId,
        weekId,
        userId,
        weekNumber: 1,
        title: "X",
        description: "",
        category: "c",
        estimatedTime: "30m",
        priority: "Must",
        status: "pending",
        isCustom: false,
        source: "system",
      });
    });

    const result = await t.action(api.whisperer.respond, {
      activityId: fakeActivityId,
    });
    expect(result.status).toBe("unauthorized");
  });

  // Fixture-based AI integration tests live in U9. They cover:
  // - AE1 stakeholder-grounded coaching for "Draft 1:1 agenda for Marcus"
  // - AE2 hybrid artifact-shaped task returns coaching + artifact + assumptions
  // - AE3 vague task returns a clarifying_question only
  // - AE6 emits whisperer_invoked + semantic_classify_scheduled
  // - AE8 malformed JSON triggers one stricter retry, then provider_unavailable
  it.skip("AE1/AE2/AE3/AE6/AE8 — covered by U9 fixture-based eval suite", () => {});
});
