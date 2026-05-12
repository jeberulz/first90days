/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema.js";
import { assembleContextBundle } from "./whispererContext.js";

const modules = {
  ...import.meta.glob("../**/*.js"),
  ...import.meta.glob("../**/*.ts"),
};

async function seedBaseline(t, { withReflection = false, withStakeholder = false } = {}) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "u@example.com" });
    await ctx.db.insert("onboardingData", {
      userId,
      roleTitle: "Engineering Manager",
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
      name: "Diagnose",
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
      theme: "Listening tour",
      reflectionPrompt: "r",
      reviewQuestions: [],
    });

    let stakeholderId = undefined;
    if (withStakeholder) {
      stakeholderId = await ctx.db.insert("stakeholders", {
        userId,
        name: "Marcus",
        role: "PM",
        relationshipType: "peer",
        priority: "high",
        firstMeetingScheduled: false,
        firstMentionedAt: Date.now(),
      });
    }

    const activityId = await ctx.db.insert("activities", {
      planId,
      weekId,
      userId,
      weekNumber: 1,
      title: "Draft 1:1 agenda for Marcus",
      description: "",
      category: "stakeholder",
      estimatedTime: "30m",
      priority: "Must",
      status: "pending",
      isCustom: false,
      source: "system",
      relatedStakeholderId: stakeholderId,
    });

    if (withReflection) {
      await ctx.db.insert("dailyReflections", {
        userId,
        date: "2026-05-11",
        energyLevel: 3,
        reflectionPrompt: "How did today go?",
        reflectionResponse: "Tough morning. Got the deploy out.",
        topAccomplishment: "Shipped the API rewrite.",
      });
    }
    return { userId, activityId };
  });
}

describe("assembleContextBundle", () => {
  it("returns null when onboarding is missing", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "x@example.com" });
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
      return { userId, activityId };
    });
    const bundle = await t.run((ctx) =>
      assembleContextBundle(ctx, { userId, activityId })
    );
    expect(bundle).toBeNull();
  });

  it("returns null when the activity belongs to another user", async () => {
    const t = convexTest(schema, modules);
    const { activityId } = await seedBaseline(t);
    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "other@example.com" })
    );
    const bundle = await t.run((ctx) =>
      assembleContextBundle(ctx, { userId: otherUserId, activityId })
    );
    expect(bundle).toBeNull();
  });

  it("returns a populated bundle when stakeholder + reflection exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedBaseline(t, {
      withReflection: true,
      withStakeholder: true,
    });
    const bundle = await t.run((ctx) =>
      assembleContextBundle(ctx, { userId, activityId })
    );
    expect(bundle).not.toBeNull();
    expect(bundle.task.title).toBe("Draft 1:1 agenda for Marcus");
    expect(bundle.user.roleTitle).toBe("Engineering Manager");
    expect(bundle.user.phaseNumber).toBe(1);
    expect(bundle.user.weekNumber).toBe(1);
    expect(bundle.linkedStakeholder).not.toBeNull();
    expect(bundle.linkedStakeholder.name).toBe("Marcus");
    expect(bundle.recentReflections.length).toBe(1);
    expect(bundle.recentReflections[0].text).toMatch(/Win:/);
  });

  it("omits reflections list when none exist", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedBaseline(t);
    const bundle = await t.run((ctx) =>
      assembleContextBundle(ctx, { userId, activityId })
    );
    expect(bundle.recentReflections).toEqual([]);
  });
});
