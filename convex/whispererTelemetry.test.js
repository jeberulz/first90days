/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema.js";
import { api, internal } from "./_generated/api";

const modules = {
  ...import.meta.glob("./**/*.js"),
  ...import.meta.glob("./**/*.ts"),
};

async function seedTurn(t, { hoursAgo = 0 } = {}) {
  return t.run(async (ctx) => {
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
      status: "open",
      turnCount: 1,
      createdAt: Date.now(),
    });
    const turnId = await ctx.db.insert("whispererTurns", {
      threadId,
      seq: 0,
      role: "assistant",
      content: "coaching text",
      modelUsed: "claude-sonnet",
      latencyMs: 800,
      createdAt: Date.now() - hoursAgo * 60 * 60 * 1000,
    });
    return { userId, activityId, threadId, turnId };
  });
}

async function readEvents(t, userId, eventType) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("planEventLog")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventType", eventType)
      )
      .collect()
  );
}

describe("markAccepted", () => {
  it("emits a whisperer_accepted row with the given path", async () => {
    const t = convexTest(schema, modules);
    const { userId, turnId } = await seedTurn(t);

    await t
      .withIdentity({ subject: userId, issuer: "test" })
      .mutation(api.whispererTelemetry.markAccepted, { turnId, path: "copy" });

    const events = await readEvents(t, userId, "whisperer_accepted");
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ path: "copy" });
    expect(events[0].turnId).toBe(turnId);
  });

  it("dedupes repeat accept signals for the same turn", async () => {
    const t = convexTest(schema, modules);
    const { userId, turnId } = await seedTurn(t);

    const ctx = t.withIdentity({ subject: userId, issuer: "test" });
    await ctx.mutation(api.whispererTelemetry.markAccepted, { turnId, path: "copy" });
    await ctx.mutation(api.whispererTelemetry.markAccepted, {
      turnId,
      path: "task_complete",
    });

    const events = await readEvents(t, userId, "whisperer_accepted");
    expect(events).toHaveLength(1);
    expect(events[0].payload.dedup_paths).toContain("task_complete");
  });

  it("rejects on cross-user access", async () => {
    const t = convexTest(schema, modules);
    const { turnId } = await seedTurn(t);
    const otherUser = await t.run((ctx) =>
      ctx.db.insert("users", { email: "other@example.com" })
    );

    await expect(
      t
        .withIdentity({ subject: otherUser, issuer: "test" })
        .mutation(api.whispererTelemetry.markAccepted, { turnId, path: "copy" })
    ).rejects.toThrow();
  });
});

describe("markDiscarded", () => {
  it("emits a whisperer_discarded row", async () => {
    const t = convexTest(schema, modules);
    const { userId, turnId } = await seedTurn(t);

    await t
      .withIdentity({ subject: userId, issuer: "test" })
      .mutation(api.whispererTelemetry.markDiscarded, { turnId });

    const events = await readEvents(t, userId, "whisperer_discarded");
    expect(events).toHaveLength(1);
  });

  it("does NOT emit a discard when the turn was already accepted", async () => {
    const t = convexTest(schema, modules);
    const { userId, turnId } = await seedTurn(t);

    const ctx = t.withIdentity({ subject: userId, issuer: "test" });
    await ctx.mutation(api.whispererTelemetry.markAccepted, { turnId, path: "copy" });
    await ctx.mutation(api.whispererTelemetry.markDiscarded, { turnId });

    const events = await readEvents(t, userId, "whisperer_discarded");
    expect(events).toHaveLength(0);
  });
});

describe("reconciliation cron", () => {
  it("emits semantic_classify_failed for an invoked turn with no semantic events", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId, threadId, turnId } = await seedTurn(t);

    await t.run(async (ctx) =>
      ctx.db.insert("planEventLog", {
        userId,
        eventType: "whisperer_invoked",
        eventCategory: "operational",
        activityId,
        threadId,
        turnId,
        deliveryStatus: "delivered",
        createdAt: Date.now() - 60 * 60 * 1000,
      })
    );

    const stats = await t.mutation(
      internal.whispererTelemetry.runReconciliationBatch,
      {}
    );
    expect(stats.recovered).toBeGreaterThanOrEqual(1);

    const recovered = await readEvents(t, userId, "semantic_classify_failed");
    expect(recovered.length).toBeGreaterThanOrEqual(1);
    expect(recovered[0].payload.recovered_by_reconciliation).toBe(true);
  });

  it("skips turns that already have any semantic event", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId, threadId, turnId } = await seedTurn(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("planEventLog", {
        userId,
        eventType: "whisperer_invoked",
        eventCategory: "operational",
        activityId,
        threadId,
        turnId,
        deliveryStatus: "delivered",
        createdAt: Date.now() - 60 * 60 * 1000,
      });
      await ctx.db.insert("planEventLog", {
        userId,
        eventType: "semantic_classify_completed_empty",
        eventCategory: "semantic",
        activityId,
        threadId,
        turnId,
        deliveryStatus: "delivered",
        createdAt: Date.now() - 30 * 60 * 1000,
      });
    });

    const stats = await t.mutation(
      internal.whispererTelemetry.runReconciliationBatch,
      {}
    );
    expect(stats.recovered).toBe(0);

    const recovered = await readEvents(t, userId, "semantic_classify_failed");
    expect(recovered).toHaveLength(0);
  });
});

describe("northStarAcceptanceRate", () => {
  it("returns null for unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    const out = await t.query(api.whispererTelemetry.northStarAcceptanceRate, {
      sinceDays: 7,
    });
    expect(out).toBeNull();
  });

  it("computes acceptance / invoked from prior planEventLog rows", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId, threadId, turnId } = await seedTurn(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("planEventLog", {
        userId,
        eventType: "whisperer_invoked",
        eventCategory: "operational",
        activityId,
        threadId,
        turnId,
        deliveryStatus: "delivered",
        createdAt: Date.now() - 60 * 60 * 1000,
      });
      await ctx.db.insert("planEventLog", {
        userId,
        eventType: "whisperer_accepted",
        eventCategory: "operational",
        activityId,
        threadId,
        turnId,
        payload: { path: "copy" },
        deliveryStatus: "delivered",
        createdAt: Date.now() - 30 * 60 * 1000,
      });
    });

    const out = await t
      .withIdentity({ subject: userId, issuer: "test" })
      .query(api.whispererTelemetry.northStarAcceptanceRate, { sinceDays: 7 });
    expect(out.invoked).toBe(1);
    expect(out.accepted).toBe(1);
    expect(out.acceptanceRate).toBe(1);
  });
});
