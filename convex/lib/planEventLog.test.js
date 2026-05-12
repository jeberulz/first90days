import { convexTest } from "convex-test";
import { expect, describe, it } from "vitest";
import schema from "../schema.js";
import { internal } from "../_generated/api";
import { writePlanEvent } from "./planEventLog.js";

async function makeUser(t, email = "u@example.com") {
  return await t.run(async (ctx) => ctx.db.insert("users", { email }));
}

describe("planEventLog.emit (internalMutation)", () => {
  it("writes one row with defaulted eventCategory + deliveryStatus + createdAt", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "happy@example.com");

    const before = Date.now();
    const eventId = await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_invoked",
    });
    const after = Date.now();

    expect(eventId).toBeTruthy();

    const row = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(row).not.toBeNull();
    expect(row.userId).toBe(userId);
    expect(row.eventType).toBe("whisperer_invoked");
    // Operational by default for whisperer_invoked
    expect(row.eventCategory).toBe("operational");
    expect(row.deliveryStatus).toBe("delivered");
    expect(row.createdAt).toBeGreaterThanOrEqual(before);
    expect(row.createdAt).toBeLessThanOrEqual(after);
    // Optional fields should be absent when not provided.
    expect(row.activityId).toBeUndefined();
    expect(row.threadId).toBeUndefined();
    expect(row.turnId).toBeUndefined();
    expect(row.payload).toBeUndefined();
    expect(row.firstSeenWeek).toBeUndefined();
  });

  it("derives eventCategory='semantic' for semantic eventTypes", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "sem@example.com");

    const eventId = await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "stuck_signaled",
    });

    const row = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(row.eventCategory).toBe("semantic");
  });

  it("explicit eventCategory overrides the default mapping", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "override@example.com");

    const eventId = await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "semantic_classify_failed",
      // Caller forces this to render in the operational dashboard even
      // though the event type sits in the classifier code path.
      eventCategory: "operational",
    });
    const row = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(row.eventCategory).toBe("operational");
  });

  it("payload undefined writes successfully (edge case)", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "nopayload@example.com");

    const eventId = await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_accepted",
      payload: undefined,
    });

    const row = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(row).not.toBeNull();
    expect(row.payload).toBeUndefined();
  });

  it("persists structured payload metadata without raw text", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "payload@example.com");

    const eventId = await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_invoked",
      payload: {
        tokensIn: 1234,
        tokensOut: 567,
        latencyMs: 890,
        modelUsed: "claude-sonnet-4",
      },
    });

    const row = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(row.payload).toEqual({
      tokensIn: 1234,
      tokensOut: 567,
      latencyMs: 890,
      modelUsed: "claude-sonnet-4",
    });
  });
});

describe("planEventLog index queries", () => {
  it("by_user_time returns rows in chronological order", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "chrono@example.com");

    // Force monotonic createdAt so the test is deterministic regardless of
    // wall-clock resolution under the edge runtime.
    const t0 = Date.now();
    const ids = [];
    for (let i = 0; i < 3; i += 1) {
      const id = await t.mutation(internal.lib.planEventLog.emit, {
        userId,
        eventType: "whisperer_invoked",
        createdAt: t0 + i,
      });
      ids.push(id);
    }

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("planEventLog")
        .withIndex("by_user_time", (q) => q.eq("userId", userId))
        .collect()
    );
    // Index is (userId, createdAt) ascending by default.
    expect(rows.map((r) => r._id)).toEqual(ids);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].createdAt).toBeGreaterThanOrEqual(rows[i - 1].createdAt);
    }
  });

  it("by_user_event filters to a single eventType for a user (and excludes other users)", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "filter@example.com");
    const otherUserId = await makeUser(t, "other@example.com");

    const t0 = Date.now();
    // 2 accepted, 1 invoked for our user; 1 accepted for another user.
    await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_accepted",
      createdAt: t0,
    });
    await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_invoked",
      createdAt: t0 + 1,
    });
    await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_accepted",
      createdAt: t0 + 2,
    });
    await t.mutation(internal.lib.planEventLog.emit, {
      userId: otherUserId,
      eventType: "whisperer_accepted",
      createdAt: t0 + 3,
    });

    const acceptedRows = await t.run(async (ctx) =>
      ctx.db
        .query("planEventLog")
        .withIndex("by_user_event", (q) =>
          q.eq("userId", userId).eq("eventType", "whisperer_accepted")
        )
        .collect()
    );
    expect(acceptedRows).toHaveLength(2);
    expect(acceptedRows.every((r) => r.userId === userId)).toBe(true);
    expect(
      acceptedRows.every((r) => r.eventType === "whisperer_accepted")
    ).toBe(true);
    // Chronological within the index.
    expect(acceptedRows[0].createdAt).toBeLessThan(acceptedRows[1].createdAt);
  });

  it("by_user_activity returns events for a single activity in order", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "act@example.com");

    // Insert a minimal plan + week + activity to obtain a valid activityId.
    // We construct just enough graph for the v.id("activities") validator.
    const planId = await t.run(async (ctx) =>
      ctx.db.insert("plans", {
        userId,
        status: "active",
        overallCompletion: 0,
      })
    );
    const phaseId = await t.run(async (ctx) =>
      ctx.db.insert("phases", {
        planId,
        userId,
        number: 1,
        name: "Phase 1",
        startDay: 1,
        endDay: 30,
        milestone: "M",
        status: "active",
      })
    );
    const weekId = await t.run(async (ctx) =>
      ctx.db.insert("weeks", {
        planId,
        phaseId,
        userId,
        number: 1,
        theme: "t",
        reflectionPrompt: "rp",
        reviewQuestions: [],
      })
    );
    const activityId = await t.run(async (ctx) =>
      ctx.db.insert("activities", {
        planId,
        weekId,
        userId,
        weekNumber: 1,
        title: "Read role expectations",
        description: "d",
        category: "c",
        estimatedTime: "30m",
        priority: "high",
        status: "pending",
        isCustom: false,
        source: "test",
      })
    );

    const t0 = Date.now();
    await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_invoked",
      activityId,
      createdAt: t0,
    });
    await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_accepted",
      activityId,
      createdAt: t0 + 1,
    });
    // An event for the same user but without an activityId should NOT
    // appear in the by_user_activity scan.
    await t.mutation(internal.lib.planEventLog.emit, {
      userId,
      eventType: "whisperer_invoked",
      createdAt: t0 + 2,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("planEventLog")
        .withIndex("by_user_activity", (q) =>
          q.eq("userId", userId).eq("activityId", activityId)
        )
        .collect()
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].eventType).toBe("whisperer_invoked");
    expect(rows[1].eventType).toBe("whisperer_accepted");
    expect(rows[0].createdAt).toBeLessThan(rows[1].createdAt);
  });
});

describe("writePlanEvent (direct in-mutation helper)", () => {
  it("co-write with another table commits both rows (transactional invariant)", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "tx@example.com");

    const { eventId, logId } = await t.run(async (ctx) => {
      const eventId = await writePlanEvent(ctx, {
        userId,
        eventType: "whisperer_invoked",
        payload: { tokensIn: 10 },
      });
      const logId = await ctx.db.insert("logEntries", {
        userId,
        type: "test",
        title: "co-write",
        date: "2026-05-12",
        category: "test",
      });
      return { eventId, logId };
    });

    const eventRow = await t.run(async (ctx) => ctx.db.get(eventId));
    const logRow = await t.run(async (ctx) => ctx.db.get(logId));
    expect(eventRow).not.toBeNull();
    expect(logRow).not.toBeNull();
    expect(eventRow.payload).toEqual({ tokensIn: 10 });
  });

  it("rolls back both writes when the surrounding mutation throws", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "rollback@example.com");

    await expect(
      t.run(async (ctx) => {
        await writePlanEvent(ctx, {
          userId,
          eventType: "whisperer_invoked",
        });
        await ctx.db.insert("logEntries", {
          userId,
          type: "test",
          title: "should-rollback",
          date: "2026-05-12",
          category: "test",
        });
        throw new Error("boom — transaction should roll back");
      })
    ).rejects.toThrow(/boom/);

    // Neither row should be present.
    const events = await t.run(async (ctx) =>
      ctx.db
        .query("planEventLog")
        .withIndex("by_user_time", (q) => q.eq("userId", userId))
        .collect()
    );
    const logs = await t.run(async (ctx) =>
      ctx.db
        .query("logEntries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    );
    expect(events).toHaveLength(0);
    expect(logs).toHaveLength(0);
  });

  it("respects explicit deliveryStatus='pending' (U5 classifier scheduling marker)", async () => {
    const t = convexTest(schema);
    const userId = await makeUser(t, "pending@example.com");

    const eventId = await t.run(async (ctx) =>
      writePlanEvent(ctx, {
        userId,
        eventType: "semantic_classify_scheduled",
        deliveryStatus: "pending",
      })
    );
    const row = await t.run(async (ctx) => ctx.db.get(eventId));
    expect(row.deliveryStatus).toBe("pending");
    expect(row.eventCategory).toBe("operational");
  });
});
