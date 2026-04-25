import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * One-shot migration helper: copy a pilot user's kbDocuments from dev to prod.
 *
 * Usage:
 *   1) Run `exportForEmail` against the dev deployment to capture entries:
 *        npx convex run migrations/pilotKbSeed:exportForEmail \
 *          '{"email":"iseghohi.john@gmail.com"}' > /tmp/pilot-kb.json
 *
 *   2) Deploy this file to prod:
 *        npx convex deploy --prod
 *
 *   3) Run `seedForEmail` against prod with the captured entries:
 *        npx convex run --prod migrations/pilotKbSeed:seedForEmail \
 *          "$(cat /tmp/pilot-kb.json | jq -c \
 *            '{email:"iseghohi.john@gmail.com", entries:.}')"
 *
 * Safe to re-run: seedForEmail skips entries whose (title, contentHash) already
 * exist on the target user, so importing the same file twice is a no-op.
 *
 * Delete this file once the migration is verified.
 */

const CATEGORY_VALIDATOR = v.union(
  v.literal("company_context"),
  v.literal("team_people"),
  v.literal("product_technology"),
  v.literal("processes_workflows"),
  v.literal("goals_notes"),
  v.literal("industry_market")
);

export const exportForEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new Error(`No user with email ${email} on this deployment`);
    }

    const docs = await ctx.db
      .query("kbDocuments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return docs
      .filter((d) => !d.archivedAt && d.draftStatus !== "discarded")
      .map((d) => ({
        title: d.title,
        content: d.content,
        category: d.category,
        sourceType: d.sourceType,
        importance: d.importance,
        type: d.type,
      }));
  },
});

export const seedForEmail = internalMutation({
  args: {
    email: v.string(),
    entries: v.array(
      v.object({
        title: v.string(),
        content: v.string(),
        category: v.optional(CATEGORY_VALIDATOR),
        sourceType: v.optional(v.string()),
        importance: v.optional(v.number()),
        type: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { email, entries }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new Error(
        `No user with email ${email} on this deployment — sign up first, then re-run`
      );
    }

    const existing = await ctx.db
      .query("kbDocuments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const existingTitles = new Set(
      existing.filter((d) => !d.archivedAt).map((d) => d.title)
    );

    let inserted = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (existingTitles.has(entry.title)) {
        skipped++;
        continue;
      }

      const sourceType =
        entry.sourceType &&
        [
          "manual",
          "upload",
          "reflection_autocapture",
          "interaction_autocapture",
          "activity_completion_autocapture",
          "ai_generated",
        ].includes(entry.sourceType)
          ? entry.sourceType
          : "manual";

      const typeValue =
        entry.type &&
        ["ai_enriched", "ai_generated", "imported", "draft"].includes(entry.type)
          ? entry.type
          : "imported";

      await ctx.runMutation(internal.kbInternal.insertDocument, {
        userId: user._id,
        title: entry.title,
        content: entry.content,
        category: entry.category,
        sourceType,
        importance: entry.importance,
        type: typeValue,
      });
      inserted++;
    }

    return { userId: user._id, inserted, skipped, total: entries.length };
  },
});
