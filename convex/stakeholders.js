import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const stakeholders = await ctx.db
      .query("stakeholders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = new Date();
    return stakeholders.map((s) => {
      let health = "none";
      if (s.lastInteractionDate) {
        const last = new Date(s.lastInteractionDate);
        const daysSince = Math.floor(
          (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
        );
        const thresholds =
          s.priority === "Must"
            ? { green: 5, yellow: 10 }
            : { green: 7, yellow: 14 };

        if (daysSince <= thresholds.green) health = "green";
        else if (daysSince <= thresholds.yellow) health = "yellow";
        else health = "red";
      }
      return { ...s, health };
    });
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

    const ids = [];
    for (const s of args.stakeholders) {
      const id = await ctx.db.insert("stakeholders", {
        userId,
        ...s,
        firstMeetingScheduled: false,
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
  },
});
