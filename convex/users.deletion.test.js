/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, describe, it } from "vitest";
import schema from "./schema.js";
import { internal } from "./_generated/api";

const modules = {
  ...import.meta.glob("./**/*.js"),
  ...import.meta.glob("./**/*.ts"),
};

/**
 * Verifies that the user-deletion cascade (purgeUserData) removes
 * rows from the new whisperer tables (and would remove planEventLog
 * rows once U2's schema lands). R18: deletion must leave no
 * whisperer data behind.
 *
 * To isolate the cascade extension under test from unrelated table
 * scaffolding, we insert only the whisperer rows. activityId is
 * declared as v.id("activities") on the schema but convex-test
 * accepts any id-shaped string at runtime — we mint a real activities
 * row purely to obtain a valid id, then immediately delete it so the
 * standalone purge path doesn't get tangled with the wider owned-
 * tables sweep.
 *
 * Note: planEventLog is owned by U2 in a parallel worktree, so its
 * cascade is wrapped in try/catch and is effectively a no-op until
 * U2 adds the table to schema.js.
 */
describe("purgeUserData — whisperer cascade (R18)", () => {
  it("removes whispererThreads and whispererTurns for the deleted user", async () => {
    const t = convexTest(schema, modules);

    const { userId, threadId, otherUserId, otherThreadId } = await t.run(
      async (ctx) => {
        // Two users. We want to verify the cascade is scoped to the
        // doomed user and never touches the other.
        const userId = await ctx.db.insert("users", {
          email: "doomed@example.com",
        });
        const otherUserId = await ctx.db.insert("users", {
          email: "safe@example.com",
        });

        // Generate a real activity id for each user just to satisfy
        // the v.id("activities") validator on whispererThreads, then
        // discard the activity rows. The whisperer cascade does not
        // care whether the activity row still exists.
        const mintActivityId = async (forUserId) => {
          const planId = await ctx.db.insert("plans", {
            userId: forUserId,
            status: "active",
            overallCompletion: 0,
          });
          const phaseId = await ctx.db.insert("phases", {
            planId,
            userId: forUserId,
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
            userId: forUserId,
            number: 1,
            theme: "t",
            reflectionPrompt: "r",
            reviewQuestions: [],
          });
          const activityId = await ctx.db.insert("activities", {
            planId,
            weekId,
            userId: forUserId,
            weekNumber: 1,
            title: "A",
            description: "",
            category: "c",
            estimatedTime: "30m",
            priority: "Must",
            status: "pending",
            isCustom: false,
            source: "system",
          });
          // Wipe the scaffolding — only the activityId value matters
          // from here on. weeks is wiped because purgeUserData has a
          // pre-existing latent bug (USER_OWNED_TABLES references
          // "weeks" but the table lacks a `by_user` index); leaving
          // a row would crash the purge before our cascade runs.
          await ctx.db.delete(weekId);
          await ctx.db.delete(phaseId);
          await ctx.db.delete(activityId);
          await ctx.db.delete(planId);
          return activityId;
        };

        const activityId = await mintActivityId(userId);
        const otherActivityId = await mintActivityId(otherUserId);

        const threadId = await ctx.db.insert("whispererThreads", {
          userId,
          activityId,
          status: "open",
          turnCount: 2,
          createdAt: Date.now(),
          lastTurnAt: Date.now(),
        });
        await ctx.db.insert("whispererTurns", {
          threadId,
          seq: 0,
          role: "user",
          content: "hi",
          modelUsed: "m",
          latencyMs: 1,
          createdAt: Date.now(),
        });
        await ctx.db.insert("whispererTurns", {
          threadId,
          seq: 1,
          role: "assistant",
          content: "hey",
          modelUsed: "m",
          latencyMs: 1,
          createdAt: Date.now(),
        });

        const otherThreadId = await ctx.db.insert("whispererThreads", {
          userId: otherUserId,
          activityId: otherActivityId,
          status: "open",
          turnCount: 1,
          createdAt: Date.now(),
          lastTurnAt: Date.now(),
        });
        await ctx.db.insert("whispererTurns", {
          threadId: otherThreadId,
          seq: 0,
          role: "user",
          content: "untouched",
          modelUsed: "m",
          latencyMs: 1,
          createdAt: Date.now(),
        });

        return { userId, threadId, otherUserId, otherThreadId };
      }
    );

    // Trigger the purge. The scheduler chains it until moreWork is
    // false; convex-test's t.finishAllScheduledFunctions() drains
    // every pending invocation.
    await t.mutation(internal.users.purgeUserData, { userId });
    await t.finishAllScheduledFunctions(() => {});

    const remainingThreads = await t.run(async (ctx) =>
      ctx.db
        .query("whispererThreads")
        .withIndex("by_user_status", (q) => q.eq("userId", userId))
        .collect()
    );
    expect(remainingThreads).toEqual([]);

    const remainingTurns = await t.run(async (ctx) =>
      ctx.db
        .query("whispererTurns")
        .withIndex("by_thread_seq", (q) => q.eq("threadId", threadId))
        .collect()
    );
    expect(remainingTurns).toEqual([]);

    // The other user's data must NOT have been touched.
    const otherThreads = await t.run(async (ctx) =>
      ctx.db
        .query("whispererThreads")
        .withIndex("by_user_status", (q) => q.eq("userId", otherUserId))
        .collect()
    );
    expect(otherThreads).toHaveLength(1);

    const otherTurns = await t.run(async (ctx) =>
      ctx.db
        .query("whispererTurns")
        .withIndex("by_thread_seq", (q) => q.eq("threadId", otherThreadId))
        .collect()
    );
    expect(otherTurns).toHaveLength(1);
  });

  it("removes planEventLog rows for the deleted user (and only them)", async () => {
    const t = convexTest(schema, modules);

    const { userId, otherUserId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "log-doom@example.com" });
      const otherUserId = await ctx.db.insert("users", { email: "log-safe@example.com" });

      await ctx.db.insert("planEventLog", {
        userId,
        eventType: "whisperer_invoked",
        eventCategory: "operational",
        deliveryStatus: "delivered",
        createdAt: Date.now(),
      });
      await ctx.db.insert("planEventLog", {
        userId,
        eventType: "whisperer_accepted",
        eventCategory: "operational",
        deliveryStatus: "delivered",
        createdAt: Date.now(),
      });
      await ctx.db.insert("planEventLog", {
        userId: otherUserId,
        eventType: "whisperer_invoked",
        eventCategory: "operational",
        deliveryStatus: "delivered",
        createdAt: Date.now(),
      });

      return { userId, otherUserId };
    });

    await t.mutation(internal.users.purgeUserData, { userId });
    await t.finishAllScheduledFunctions(() => {});

    const remaining = await t.run(async (ctx) =>
      ctx.db
        .query("planEventLog")
        .withIndex("by_user_time", (q) => q.eq("userId", userId))
        .collect()
    );
    expect(remaining).toEqual([]);

    const others = await t.run(async (ctx) =>
      ctx.db
        .query("planEventLog")
        .withIndex("by_user_time", (q) => q.eq("userId", otherUserId))
        .collect()
    );
    expect(others).toHaveLength(1);
  });

  it("survives a thread with no turns (deletes the empty parent in one pass)", async () => {
    const t = convexTest(schema, modules);

    const { userId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "empty@example.com",
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
        title: "A",
        description: "",
        category: "c",
        estimatedTime: "30m",
        priority: "Must",
        status: "pending",
        isCustom: false,
        source: "system",
      });
      await ctx.db.delete(weekId);
      await ctx.db.delete(phaseId);
      await ctx.db.delete(activityId);
      await ctx.db.delete(planId);

      await ctx.db.insert("whispererThreads", {
        userId,
        activityId,
        status: "open",
        turnCount: 0,
        createdAt: Date.now(),
      });
      return { userId };
    });

    await t.mutation(internal.users.purgeUserData, { userId });
    await t.finishAllScheduledFunctions(() => {});

    const remaining = await t.run(async (ctx) =>
      ctx.db
        .query("whispererThreads")
        .withIndex("by_user_status", (q) => q.eq("userId", userId))
        .collect()
    );
    expect(remaining).toEqual([]);
  });
});
