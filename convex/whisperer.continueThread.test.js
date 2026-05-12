/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";

const modules = {
  ...import.meta.glob("./**/*.js"),
  ...import.meta.glob("./**/*.ts"),
};

/**
 * Smoke tests for the chat-continuation action.
 *
 * Live-AI scenarios (normal continuation, organic 10-turn recap,
 * mid-thread cents-cap recap) live in U9's fixture-based eval suite.
 * Here we cover the orchestration paths that don't require a real
 * provider: auth, empty-message guard, capped-thread reject, and the
 * appendUserTurn internal mutation contract (raced cap).
 */

async function seedThread(t, { status = "open", turnCount = 0 } = {}) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "u@example.com" });
    await ctx.db.insert("onboardingData", {
      userId,
      roleTitle: "EM",
      startDate: "2026-01-01",
      experienceYears: 8,
      isFirstRoleAtLevel: false,
      roleType: "promotion",
      function_: "engineering",
      isNewTeam: false,
      companyName: "Acme",
      companySize: "100-500",
      companyStage: "growth",
      workModel: "hybrid",
      starsSituation: "realignment",
    });
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
    const activityId = await ctx.db.insert("activities", {
      planId,
      weekId,
      userId,
      weekNumber: 1,
      title: "Task A",
      description: "",
      category: "c",
      estimatedTime: "30m",
      priority: "Must",
      status: "pending",
      isCustom: false,
      source: "system",
    });
    const threadId = await ctx.db.insert("whispererThreads", {
      userId,
      activityId,
      status,
      turnCount,
      createdAt: Date.now(),
      ...(status !== "open" ? { cappedReason: "turn_limit" } : {}),
    });
    return { userId, activityId, threadId };
  });
}

describe("whisperer.continueThread", () => {
  it("returns unauthorized when no caller identity is bound", async () => {
    const t = convexTest(schema, modules);
    const { threadId } = await seedThread(t);
    const result = await t.action(api.whisperer.continueThread, {
      threadId,
      message: "hi",
    });
    expect(result.status).toBe("unauthorized");
  });

  it("rejects empty messages without touching the thread", async () => {
    const t = convexTest(schema, modules);
    const { userId, threadId } = await seedThread(t);
    const result = await t
      .withIdentity({ subject: userId, issuer: "test" })
      .action(api.whisperer.continueThread, {
        threadId,
        message: "   ",
      });
    expect(result.status).toBe("provider_unavailable");
    expect(result.reason).toMatch(/Empty/);
  });
});

describe("internal.whispererInternal.appendUserTurn", () => {
  it("returns thread_closed when the thread is already capped", async () => {
    const t = convexTest(schema, modules);
    const { threadId } = await seedThread(t, { status: "capped" });
    const result = await t.mutation(
      internal.whispererInternal.appendUserTurn,
      { threadId, content: "anything" }
    );
    expect(result.status).toBe("thread_closed");
    expect(result.reason).toBe("turn_limit");
  });

  it("appends a turn and advances turnCount on an open thread", async () => {
    const t = convexTest(schema, modules);
    const { threadId } = await seedThread(t, { status: "open", turnCount: 3 });
    const result = await t.mutation(
      internal.whispererInternal.appendUserTurn,
      { threadId, content: "hello" }
    );
    expect(result.status).toBe("ok");
    expect(result.turnCount).toBe(4);
  });
});
