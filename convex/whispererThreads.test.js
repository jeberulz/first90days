/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, describe, it } from "vitest";
import schema from "./schema.js";
import { internal } from "./_generated/api";

// Glob is anchored at this test file's location so convex-test sees
// the worktree's convex/ tree (npm and node_modules live above the
// worktree root, so the default glob points elsewhere).
const modules = {
  ...import.meta.glob("./**/*.js"),
  ...import.meta.glob("./**/*.ts"),
};

/**
 * Helpers — fabricate the minimum scaffolding (user, plan, week,
 * activity) needed to point a thread at a real activityId. The
 * whisperer storage layer doesn't care about activity ownership or
 * billing; auth and tier gates live in the orchestration layer.
 */
async function seedUserAndActivity(t) {
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
    return { userId, activityId };
  });
}

describe("whispererThreads.createThread", () => {
  it("creates a fresh thread for a new (userId, activityId) pair", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread).not.toBeNull();
    expect(thread.userId).toBe(userId);
    expect(thread.activityId).toBe(activityId);
    expect(thread.status).toBe("open");
    expect(thread.turnCount).toBe(0);
    expect(thread.lastTurnAt).toBeUndefined();
    expect(thread.cappedReason).toBeUndefined();
  });

  it("is idempotent — second call for same pair returns the same thread id", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const firstId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );
    const secondId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );
    expect(secondId).toBe(firstId);

    // And no duplicate row was inserted.
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("whispererThreads")
        .withIndex("by_user_activity", (q) =>
          q.eq("userId", userId).eq("activityId", activityId)
        )
        .collect()
    );
    expect(rows).toHaveLength(1);
  });
});

describe("whispererThreads.appendTurn", () => {
  it("appends with monotonic seq and updates parent atomically", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );

    const first = await t.mutation(internal.whispererThreads.appendTurn, {
      threadId,
      role: "user",
      content: "Help me with stakeholders",
      modelUsed: "test-model",
      latencyMs: 12,
    });
    expect(first.seq).toBe(0);

    const second = await t.mutation(internal.whispererThreads.appendTurn, {
      threadId,
      role: "assistant",
      content: "Start with your manager.",
      modelUsed: "test-model",
      latencyMs: 230,
      assumptions: ["user has a manager"],
      tokenCounts: { input: 50, output: 25 },
    });
    expect(second.seq).toBe(1);

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread.turnCount).toBe(2);
    expect(thread.lastTurnAt).toBeTypeOf("number");

    const turns = await t.query(internal.whispererThreads.listTurns, {
      threadId,
    });
    expect(turns).toHaveLength(2);
    expect(turns.map((t) => t.seq)).toEqual([0, 1]);
    expect(turns[1].tokenCounts).toEqual({ input: 50, output: 25 });
  });

  it("rejects appends to a capped thread", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );
    await t.mutation(internal.whispererThreads.markCapped, {
      threadId,
      reason: "turn_limit",
    });

    await expect(
      t.mutation(internal.whispererThreads.appendTurn, {
        threadId,
        role: "user",
        content: "one more thing",
        modelUsed: "m",
        latencyMs: 1,
      })
    ).rejects.toThrow(/capped/);
  });

  it("rejects appends to a closed thread", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(threadId, { status: "closed" });
    });

    await expect(
      t.mutation(internal.whispererThreads.appendTurn, {
        threadId,
        role: "user",
        content: "after close",
        modelUsed: "m",
        latencyMs: 1,
      })
    ).rejects.toThrow(/closed/);
  });
});

describe("whispererThreads.getByActivity", () => {
  it("returns the same thread on reopening Task A (AE4)", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );

    for (let i = 0; i < 3; i++) {
      await t.mutation(internal.whispererThreads.appendTurn, {
        threadId,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `turn ${i}`,
        modelUsed: "m",
        latencyMs: 1,
      });
    }

    const reopened = await t.query(internal.whispererThreads.getByActivity, {
      userId,
      activityId,
    });
    expect(reopened._id).toBe(threadId);
    expect(reopened.turnCount).toBe(3);

    const turns = await t.query(internal.whispererThreads.listTurns, {
      threadId,
    });
    expect(turns).toHaveLength(3);
  });

  it("returns null for a task that has never been whispered (Task B / AE4)", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);
    // Create a *different* activity (Task B) with no thread.
    const taskBId = await t.run(async (ctx) => {
      const a = await ctx.db.get(activityId);
      return ctx.db.insert("activities", {
        planId: a.planId,
        weekId: a.weekId,
        userId,
        weekNumber: 1,
        title: "Task B",
        description: "",
        category: "c",
        estimatedTime: "30m",
        priority: "Must",
        status: "pending",
        isCustom: false,
        source: "system",
      });
    });

    // Open and use Task A's thread.
    await t.mutation(internal.whispererThreads.createThread, {
      userId,
      activityId,
    });

    // Task B should still come back as null.
    const noThread = await t.query(
      internal.whispererThreads.getByActivity,
      { userId, activityId: taskBId }
    );
    expect(noThread).toBeNull();
  });
});

describe("whispererThreads.markCapped", () => {
  it("transitions open → capped and records the reason", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );

    await t.mutation(internal.whispererThreads.markCapped, {
      threadId,
      reason: "cents_ceiling",
    });

    const after = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(after.status).toBe("capped");
    expect(after.cappedReason).toBe("cents_ceiling");
  });

  it("is a no-op on a thread that is already capped", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );
    await t.mutation(internal.whispererThreads.markCapped, {
      threadId,
      reason: "turn_limit",
    });
    // Second call with a different reason should NOT overwrite the
    // original signal.
    await t.mutation(internal.whispererThreads.markCapped, {
      threadId,
      reason: "escalate",
    });

    const after = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(after.cappedReason).toBe("turn_limit");
  });

  it("rejects capping a closed thread", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(threadId, { status: "closed" });
    });

    await expect(
      t.mutation(internal.whispererThreads.markCapped, {
        threadId,
        reason: "turn_limit",
      })
    ).rejects.toThrow(/closed/);
  });
});

describe("whispererThreads — concurrent appends keep seq monotonic", () => {
  it("two parallel appendTurn calls produce distinct seqs (no duplicates)", async () => {
    const t = convexTest(schema, modules);
    const { userId, activityId } = await seedUserAndActivity(t);

    const threadId = await t.mutation(
      internal.whispererThreads.createThread,
      { userId, activityId }
    );

    // Convex mutations are transactional — two racing appendTurn calls
    // are serialised, so the seqs must come out as a contiguous range
    // starting at 0.
    await Promise.all([
      t.mutation(internal.whispererThreads.appendTurn, {
        threadId,
        role: "user",
        content: "A",
        modelUsed: "m",
        latencyMs: 1,
      }),
      t.mutation(internal.whispererThreads.appendTurn, {
        threadId,
        role: "user",
        content: "B",
        modelUsed: "m",
        latencyMs: 1,
      }),
    ]);

    const turns = await t.query(internal.whispererThreads.listTurns, {
      threadId,
    });
    const seqs = turns.map((t) => t.seq).sort((a, b) => a - b);
    expect(seqs).toEqual([0, 1]);

    const thread = await t.run(async (ctx) => ctx.db.get(threadId));
    expect(thread.turnCount).toBe(2);
  });
});
