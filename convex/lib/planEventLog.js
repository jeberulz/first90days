/**
 * Plan event log emission helper (U2).
 *
 * The `planEventLog` table is the system-emitted substrate that every
 * whisperer surface (one-shot, chat, semantic classifier, quota gate) writes
 * into. This module exposes the canonical "write one row" primitive plus an
 * `internalMutation` wrapper that callers in other actions/mutations invoke
 * via `ctx.runMutation(internal.lib.planEventLog.emit, args)`.
 *
 * ## Delivery semantics
 *
 * - From inside a mutation (transactional path) → call `writePlanEvent(ctx,
 *   args)` directly. Both writes commit together; if anything throws, the
 *   event row rolls back with the rest of the mutation. This is the
 *   guarantee callers like U4's response builder rely on.
 * - From inside an action (V8 or Node runtime) → call `ctx.runMutation(
 *   internal.lib.planEventLog.emit, args)`. Convex queues the mutation
 *   independently so the surrounding action can finish its main job (build
 *   the user-facing response) without waiting on event-log durability.
 *
 * ## Privacy
 *
 * `payload` is structured metadata ONLY. Token counts, latency, classifier
 * outputs, referenced entity ids — yes. Raw prompt or response text — no.
 * Raw turn content lives in `whispererTurns.content` (U3) where retention is
 * tracked separately. See `convex/schema.js:planEventLog` for the table-
 * level privacy comment.
 *
 * ## Pattern precedent
 *
 * Modelled on `convex/lib/kbContext.js:recordRetrieval` + `convex/kb.js:
 * recordRetrievalInternal`: a thin async helper that proxies to an
 * `internalMutation` for cross-runtime callers, plus a direct in-mutation
 * write helper.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server.js";
import { internal } from "../_generated/api.js";

// Mirror of the schema.eventType union. Kept inline (not imported) because
// the generated dataModel does not expose v.union literals as a reusable
// validator object — duplicating is the convex idiom.
const eventTypeValidator = v.union(
  // Operational
  v.literal("whisperer_invoked"),
  v.literal("whisperer_accepted"),
  v.literal("whisperer_edited"),
  v.literal("whisperer_discarded"),
  v.literal("whisperer_chat_expanded"),
  v.literal("whisperer_chat_capped"),
  v.literal("clarifying_question_asked"),
  v.literal("semantic_classify_scheduled"),
  v.literal("semantic_classify_completed_empty"),
  v.literal("semantic_classify_failed"),
  // Semantic
  v.literal("stuck_signaled"),
  v.literal("blocker_named"),
  v.literal("stakeholder_referenced"),
  v.literal("task_reframed"),
  v.literal("commitment_made")
);

const eventCategoryValidator = v.union(
  v.literal("operational"),
  v.literal("semantic")
);

const deliveryStatusValidator = v.union(
  v.literal("delivered"),
  v.literal("pending"),
  v.literal("failed")
);

// Default categorisation derived from eventType when the caller does not
// supply one. Centralising this keeps every call site honest about the
// operational/semantic split without forcing each one to repeat it.
const SEMANTIC_EVENTS = new Set([
  "stuck_signaled",
  "blocker_named",
  "stakeholder_referenced",
  "task_reframed",
  "commitment_made",
]);

function defaultCategoryFor(eventType) {
  return SEMANTIC_EVENTS.has(eventType) ? "semantic" : "operational";
}

/**
 * Direct write helper. Call this from any mutation that already has a
 * `MutationCtx`. Returns the newly-inserted event id. The write participates
 * in the surrounding mutation's transaction.
 *
 * @param {import("../_generated/server.js").MutationCtx} ctx
 * @param {Object} args
 * @param {import("../_generated/dataModel.js").Id<"users">} args.userId
 * @param {string} args.eventType - One of the eventTypeValidator literals.
 * @param {"operational"|"semantic"} [args.eventCategory] - Derived from
 *   eventType when omitted.
 * @param {import("../_generated/dataModel.js").Id<"activities">} [args.activityId]
 * @param {import("../_generated/dataModel.js").Id<"whispererThreads">} [args.threadId]
 * @param {import("../_generated/dataModel.js").Id<"whispererTurns">} [args.turnId]
 * @param {Object} [args.payload] - Structured metadata only — see module
 *   docblock. No raw prompt/response text.
 * @param {"delivered"|"pending"|"failed"} [args.deliveryStatus="delivered"]
 * @param {number} [args.firstSeenWeek]
 * @param {number} [args.createdAt] - Defaults to Date.now().
 * @returns {Promise<import("../_generated/dataModel.js").Id<"planEventLog">>}
 */
export async function writePlanEvent(ctx, args) {
  const {
    userId,
    eventType,
    eventCategory,
    activityId,
    threadId,
    turnId,
    payload,
    deliveryStatus = "delivered",
    firstSeenWeek,
    createdAt,
  } = args;

  const row = {
    userId,
    eventType,
    eventCategory: eventCategory ?? defaultCategoryFor(eventType),
    deliveryStatus,
    createdAt: typeof createdAt === "number" ? createdAt : Date.now(),
  };
  if (activityId !== undefined) row.activityId = activityId;
  if (threadId !== undefined) row.threadId = threadId;
  if (turnId !== undefined) row.turnId = turnId;
  if (payload !== undefined) row.payload = payload;
  if (firstSeenWeek !== undefined) row.firstSeenWeek = firstSeenWeek;

  return await ctx.db.insert("planEventLog", row);
}

/**
 * Internal mutation wrapper around `writePlanEvent`. Cross-runtime callers
 * (actions, scheduled jobs) reach this via
 * `internal.lib.planEventLog.emit`. Never exposed to client-facing
 * `mutation`/`action` registrations — events are server-emitted only.
 */
export const emit = internalMutation({
  args: {
    userId: v.id("users"),
    eventType: eventTypeValidator,
    eventCategory: v.optional(eventCategoryValidator),
    activityId: v.optional(v.id("activities")),
    threadId: v.optional(v.id("whispererThreads")),
    turnId: v.optional(v.id("whispererTurns")),
    payload: v.optional(v.any()),
    deliveryStatus: v.optional(deliveryStatusValidator),
    firstSeenWeek: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await writePlanEvent(ctx, args);
  },
});

/**
 * Non-blocking emit from an action context. Callers use this to fire an
 * event without awaiting its database commit on the user-facing critical
 * path. The returned promise resolves to the event id, but most call sites
 * intentionally do NOT await it.
 *
 * Pattern precedent: `convex/lib/kbContext.js:recordRetrieval`.
 *
 * @param {import("../_generated/server.js").ActionCtx} ctx
 * @param {Object} args - Same shape as the `emit` internalMutation args.
 */
export async function emitPlanEvent(ctx, args) {
  return await ctx.runMutation(internal.lib.planEventLog.emit, args);
}
