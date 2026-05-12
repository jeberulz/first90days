import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import {
  computeHealth,
  isSnoozed,
  todayYmdInTz,
  snoozeUntilYmd,
  describeNudge,
  compareNudgeUrgency,
} from "./lib/stakeholderCadence.js";
import { resolveUserTimezone } from "./lib/planDates.js";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    const todayYmd = todayYmdInTz(resolveUserTimezone(user));

    const stakeholders = await ctx.db
      .query("stakeholders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return stakeholders.map((s) => {
      const { health, daysSince, thresholds } = computeHealth(s, todayYmd);
      return { ...s, health, daysSince, thresholds };
    });
  },
});

/**
 * Stakeholders that need a nudge on the Today page: yellow, red, or
 * never-contacted. Snoozed rows are filtered out. Sorted by urgency
 * (most overdue first) then by days-since.
 */
export const listNudges = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    const today = todayYmdInTz(resolveUserTimezone(user));

    const stakeholders = await ctx.db
      .query("stakeholders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const enriched = stakeholders
      .filter((s) => !isSnoozed(s, today))
      .map((s) => {
        const { health, daysSince, thresholds } = computeHealth(s, today);
        return { s, health, daysSince, thresholds };
      })
      .filter(
        ({ health, s }) =>
          // Never-contacted rows are only nudges for Must-priority folks —
          // otherwise the Today page would flood on day 1.
          health === "red" ||
          health === "yellow" ||
          (health === "none" && s.priority === "Must")
      )
      .sort(compareNudgeUrgency)
      .slice(0, 6)
      .map(({ s, health, daysSince, thresholds }) => ({
        _id: s._id,
        name: s.name,
        role: s.role,
        priority: s.priority,
        relationshipType: s.relationshipType,
        lastInteractionDate: s.lastInteractionDate ?? null,
        cadenceDays: s.cadenceDays ?? null,
        daysSince,
        health,
        thresholds,
        reason: describeNudge(s, health, daysSince) || "",
      }));

    return enriched;
  },
});

export const get = query({
  args: { id: v.id("stakeholders") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const stakeholder = await ctx.db.get(args.id);
    if (!stakeholder || stakeholder.userId !== userId) return null;

    const interactions = await ctx.db
      .query("interactions")
      .withIndex("by_stakeholder", (q) => q.eq("stakeholderId", args.id))
      .collect();

    return {
      ...stakeholder,
      interactions: interactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  },
});

export const createBatch = mutation({
  args: {
    stakeholders: v.array(
      v.object({
        name: v.string(),
        role: v.string(),
        relationshipType: v.string(),
        priority: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const ids = [];
    for (const s of args.stakeholders) {
      const id = await ctx.db.insert("stakeholders", {
        userId,
        ...s,
        firstMeetingScheduled: false,
        firstMentionedAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    relationshipType: v.string(),
    priority: v.string(),
    stance: v.optional(v.string()),
    notes: v.optional(v.string()),
    email: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("stakeholders", {
      userId,
      ...args,
      firstMeetingScheduled: false,
      firstMentionedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("stakeholders"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    relationshipType: v.optional(v.string()),
    priority: v.optional(v.string()),
    stance: v.optional(v.string()),
    influenceLevel: v.optional(v.string()),
    interestLevel: v.optional(v.string()),
    notes: v.optional(v.string()),
    backgroundContext: v.optional(v.string()),
    workingPreferences: v.optional(v.array(v.string())),
    firstMeetingScheduled: v.optional(v.boolean()),
    firstMeetingDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stakeholder = await ctx.db.get(args.id);
    if (!stakeholder || stakeholder.userId !== userId) {
      throw new Error("Stakeholder not found");
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("stakeholders") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stakeholder = await ctx.db.get(args.id);
    if (!stakeholder || stakeholder.userId !== userId) {
      throw new Error("Stakeholder not found");
    }

    await ctx.db.delete(args.id);
  },
});

export const addInteraction = mutation({
  args: {
    stakeholderId: v.id("stakeholders"),
    date: v.string(),
    type: v.string(),
    title: v.optional(v.string()),
    notes: v.string(),
    actionItems: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
          dueDate: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stakeholder = await ctx.db.get(args.stakeholderId);
    if (!stakeholder || stakeholder.userId !== userId) {
      throw new Error("Stakeholder not found");
    }

    const interactionId = await ctx.db.insert("interactions", {
      ...args,
      userId,
    });

    await ctx.db.patch(args.stakeholderId, {
      lastInteractionDate: args.date,
    });

    // Auto-capture into the KB brain (opt-out via users.settings.kb.autoIngestInteractions).
    await ctx.scheduler.runAfter(0, internal.kbAutoCapture.fromInteraction, {
      interactionId,
    });

    // Logging an interaction clears any existing snooze — if the user
    // just talked to this person the nudge is resolved.
    if (stakeholder.nudgeSnoozedUntil) {
      await ctx.db.patch(args.stakeholderId, { nudgeSnoozedUntil: undefined });
    }
  },
});

/**
 * Set (or clear) a custom target cadence in days. null/undefined resets
 * the stakeholder back to priority-based defaults.
 */
export const updateCadence = mutation({
  args: {
    id: v.id("stakeholders"),
    cadenceDays: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stakeholder = await ctx.db.get(args.id);
    if (!stakeholder || stakeholder.userId !== userId) {
      throw new Error("Stakeholder not found");
    }

    if (args.cadenceDays === null) {
      await ctx.db.patch(args.id, { cadenceDays: undefined });
      return;
    }
    if (args.cadenceDays < 1 || args.cadenceDays > 180) {
      throw new Error("Cadence must be between 1 and 180 days");
    }
    await ctx.db.patch(args.id, { cadenceDays: Math.round(args.cadenceDays) });
  },
});

/**
 * Snooze the nudge for N days. N defaults to 3. Called from the Today
 * page "Snooze" button.
 */
export const snoozeNudge = mutation({
  args: {
    id: v.id("stakeholders"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stakeholder = await ctx.db.get(args.id);
    if (!stakeholder || stakeholder.userId !== userId) {
      throw new Error("Stakeholder not found");
    }

    const days = Math.max(1, Math.min(30, Math.round(args.days ?? 3)));
    const user = await ctx.db.get(userId);
    const tz = resolveUserTimezone(user);
    await ctx.db.patch(args.id, {
      nudgeSnoozedUntil: snoozeUntilYmd(tz, days),
    });
  },
});
