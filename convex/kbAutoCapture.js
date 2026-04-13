import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Auto-capture in-app activity into the KB. Each handler reads the source
 * row, checks the user's per-source opt-out, formats a markdown blob, and
 * inserts a kbDocument via internal.kbInternal.insertDocument (which then
 * schedules the embed + enrich pipeline).
 *
 * Wired from:
 *   - convex/reflections.js  saveDailyReflection  → fromReflection
 *   - convex/stakeholders.js addInteraction       → fromInteraction
 *   - convex/activities.js   complete             → fromActivityCompletion
 *
 * All defaults are ON. Users opt out via users.settings.kb.* booleans.
 */

function settingDefaultsTrue(value) {
  return value !== false; // undefined/null/true → true
}

export const fromReflection = internalAction({
  args: { reflectionId: v.id("dailyReflections") },
  handler: async (ctx, { reflectionId }) => {
    const reflection = await ctx.runQuery(
      internal.kbAutoCapture.getReflectionInternal,
      { reflectionId }
    );
    if (!reflection) return;

    const settings = await ctx.runQuery(
      internal.kbInternal.getUserSettingsInternal,
      { userId: reflection.userId }
    );
    if (!settingDefaultsTrue(settings?.kb?.autoIngestReflections)) return;

    const lines = [
      `# Daily reflection — ${reflection.date}`,
      ``,
      `Energy level: ${reflection.energyLevel}/10`,
    ];
    if (reflection.topAccomplishment)
      lines.push(``, `**Top accomplishment**`, reflection.topAccomplishment);
    if (reflection.reflectionPrompt)
      lines.push(``, `**Prompt**`, reflection.reflectionPrompt);
    if (reflection.reflectionResponse)
      lines.push(``, `**Response**`, reflection.reflectionResponse);
    if (reflection.blockers)
      lines.push(``, `**Blockers**`, reflection.blockers);
    if (reflection.tomorrowFocus)
      lines.push(``, `**Tomorrow focus**`, reflection.tomorrowFocus);

    const content = lines.join("\n");
    if (content.length < 40) return; // nothing meaningful

    await ctx.runMutation(internal.kbInternal.insertDocument, {
      userId: reflection.userId,
      title: `Reflection — ${reflection.date}`,
      content,
      category: "goals_notes",
      sourceType: "reflection_autocapture",
    });
  },
});

export const fromInteraction = internalAction({
  args: { interactionId: v.id("interactions") },
  handler: async (ctx, { interactionId }) => {
    const data = await ctx.runQuery(
      internal.kbAutoCapture.getInteractionInternal,
      { interactionId }
    );
    if (!data) return;

    const { interaction, stakeholder } = data;

    const settings = await ctx.runQuery(
      internal.kbInternal.getUserSettingsInternal,
      { userId: interaction.userId }
    );
    if (!settingDefaultsTrue(settings?.kb?.autoIngestInteractions)) return;

    const lines = [
      `# Interaction with ${stakeholder?.name || "stakeholder"} — ${interaction.date}`,
      ``,
      `Type: ${interaction.type}`,
    ];
    if (interaction.title) lines.push(`Title: ${interaction.title}`);
    lines.push(``, `**Notes**`, interaction.notes || "(no notes)");
    if (interaction.actionItems && interaction.actionItems.length > 0) {
      lines.push(``, `**Action items**`);
      for (const item of interaction.actionItems) {
        const status = item.completed ? "[x]" : "[ ]";
        const due = item.dueDate ? ` (due ${item.dueDate})` : "";
        lines.push(`- ${status} ${item.text}${due}`);
      }
    }

    const content = lines.join("\n");
    if (content.length < 40) return;

    await ctx.runMutation(internal.kbInternal.insertDocument, {
      userId: interaction.userId,
      title: `Interaction with ${stakeholder?.name || "stakeholder"} — ${interaction.date}`,
      content,
      category: "team_people",
      sourceType: "interaction_autocapture",
      entityLinks: [
        { type: "stakeholder", id: interaction.stakeholderId },
      ],
    });
  },
});

export const fromActivityCompletion = internalAction({
  args: { activityId: v.id("activities") },
  handler: async (ctx, { activityId }) => {
    const activity = await ctx.runQuery(
      internal.kbAutoCapture.getActivityInternal,
      { activityId }
    );
    if (!activity) return;
    if (!activity.completionNotes || !activity.completionNotes.trim()) return;

    const settings = await ctx.runQuery(
      internal.kbInternal.getUserSettingsInternal,
      { userId: activity.userId }
    );
    if (!settingDefaultsTrue(settings?.kb?.autoIngestActivityNotes)) return;

    const lines = [
      `# Completed: ${activity.title}`,
      ``,
      `Category: ${activity.category}`,
    ];
    if (activity.description) lines.push(``, activity.description);
    lines.push(``, `**Completion notes**`, activity.completionNotes);

    const content = lines.join("\n");

    const entityLinks = [];
    if (activity.relatedStakeholderId) {
      entityLinks.push({ type: "stakeholder", id: activity.relatedStakeholderId });
    }
    if (activity.relatedGoalId) {
      entityLinks.push({ type: "goal", id: activity.relatedGoalId });
    }

    await ctx.runMutation(internal.kbInternal.insertDocument, {
      userId: activity.userId,
      title: `Completed: ${activity.title}`,
      content,
      category: "goals_notes",
      sourceType: "activity_completion_autocapture",
      entityLinks: entityLinks.length > 0 ? entityLinks : undefined,
    });
  },
});

// ---------- Internal queries ----------

import { internalQuery } from "./_generated/server";

export const getReflectionInternal = internalQuery({
  args: { reflectionId: v.id("dailyReflections") },
  handler: async (ctx, { reflectionId }) => {
    return await ctx.db.get(reflectionId);
  },
});

export const getInteractionInternal = internalQuery({
  args: { interactionId: v.id("interactions") },
  handler: async (ctx, { interactionId }) => {
    const interaction = await ctx.db.get(interactionId);
    if (!interaction) return null;
    const stakeholder = await ctx.db.get(interaction.stakeholderId);
    return { interaction, stakeholder };
  },
});

export const getActivityInternal = internalQuery({
  args: { activityId: v.id("activities") },
  handler: async (ctx, { activityId }) => {
    return await ctx.db.get(activityId);
  },
});
