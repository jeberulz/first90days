"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server.js";

/**
 * U5 stub: `classifyTurnSemantic` is the Haiku-driven semantic
 * classifier that U5 will implement. For now this is a no-op so the
 * scheduler hop in `whisperer.respond` has a valid binding.
 *
 * U5 will:
 *   1. Reserve OP_COSTS.whisperer_semantic via rateLimit.
 *   2. Call Haiku with a tight closed-enum classification schema.
 *   3. For each label, emit a semantic planEventLog row (or
 *      `semantic_classify_completed_empty` when no labels match).
 *   4. Emit `semantic_classify_failed` on retry-then-failure.
 *
 * Keeping the stub here means U4 can wire ctx.scheduler.runAfter(0,
 * internal.whispererSemantic.classifyTurnSemantic, …) today without
 * forking a placeholder API surface in U5's PR.
 */
export const classifyTurnSemantic = internalAction({
  args: {
    turnId: v.id("whispererTurns"),
    threadId: v.id("whispererThreads"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async () => {
    // U5 will replace this body. The intentional no-op return keeps
    // the scheduler hop free of errors during the U4-only window.
    return null;
  },
});
