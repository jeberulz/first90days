import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Project-wide scheduled jobs. Keep this file thin — the actual work
 * lives in the referenced modules.
 */

const crons = cronJobs();

// Priority 5 — weekly memory decay. Walks active memories, applies the
// `MEMORY_WEEKLY_DECAY` multiplier per week of disuse past the 30-day
// threshold, and hides decayed-to-dust memories from the visible stream.
// Implementation in convex/kbMemoryDecay.js. Math is in
// convex/lib/kbMemoryDecayMath.js (unit tested). Safe to re-run within a
// week — `lastDecayedAt` gates the tick count.
crons.interval(
  "kb: weekly memory decay",
  { hours: 24 * 7 },
  internal.kbMemoryDecay.runDecayNow,
  {}
);

export default crons;
