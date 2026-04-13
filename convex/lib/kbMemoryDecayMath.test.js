import { describe, it, expect } from "vitest";
import {
  computeDecayedConfidence,
  applyUsageBoost,
} from "./kbMemoryDecayMath.js";

const DAY_MS = 1000 * 60 * 60 * 24;
const WEEK_MS = 7 * DAY_MS;

describe("computeDecayedConfidence", () => {
  const baseArgs = {
    confidence: 0.8,
    creationTime: 0,
    nowMs: 100 * DAY_MS,
    weeklyDecay: 0.95,
    unusedThresholdDays: 30,
  };

  it("is a no-op if disuse is under the threshold", () => {
    // Used 29 days ago, threshold 30 → no decay
    const r = computeDecayedConfidence({
      ...baseArgs,
      lastUsedAt: 100 * DAY_MS - 29 * DAY_MS,
    });
    expect(r.changed).toBe(false);
    expect(r.newConfidence).toBeCloseTo(0.8, 6);
  });

  it("applies one weekly tick when one full week past threshold", () => {
    // Disuse anchor is at (nowMs - (30+7)*DAY_MS). Threshold is 30 days,
    // so we're 7 days past it → 1 tick.
    const r = computeDecayedConfidence({
      ...baseArgs,
      lastUsedAt: 100 * DAY_MS - 37 * DAY_MS,
    });
    expect(r.weeksApplied).toBe(1);
    expect(r.newConfidence).toBeCloseTo(0.8 * 0.95, 6);
  });

  it("applies multiple catch-up ticks (cron was offline)", () => {
    // 30-day threshold + 3 weeks unused → 3 ticks
    const r = computeDecayedConfidence({
      ...baseArgs,
      lastUsedAt: 100 * DAY_MS - (30 + 21) * DAY_MS,
    });
    expect(r.weeksApplied).toBe(3);
    expect(r.newConfidence).toBeCloseTo(0.8 * Math.pow(0.95, 3), 6);
  });

  it("skips decay if lastDecayedAt is within one week", () => {
    // Past threshold, but decayed 3 days ago → skip.
    const r = computeDecayedConfidence({
      ...baseArgs,
      lastUsedAt: 100 * DAY_MS - 60 * DAY_MS,
      lastDecayedAt: 100 * DAY_MS - 3 * DAY_MS,
    });
    expect(r.changed).toBe(false);
    expect(r.weeksApplied).toBe(0);
  });

  it("respects lastDecayedAt when computing tick count (no double-decay)", () => {
    // Unused since day 0, threshold 30, now day 100. Already decayed on
    // day 93 → only one more tick should apply, not many.
    const r = computeDecayedConfidence({
      ...baseArgs,
      lastUsedAt: 0,
      lastDecayedAt: 100 * DAY_MS - 7 * DAY_MS,
    });
    expect(r.weeksApplied).toBe(1);
    expect(r.newConfidence).toBeCloseTo(0.8 * 0.95, 6);
  });

  it("falls back to creationTime when lastUsedAt is missing", () => {
    const r = computeDecayedConfidence({
      ...baseArgs,
      creationTime: 100 * DAY_MS - 45 * DAY_MS,
      lastUsedAt: undefined,
    });
    // 45 days old, threshold 30 → 15 days past, 2 full weeks → 2 ticks
    expect(r.weeksApplied).toBe(2);
    expect(r.newConfidence).toBeCloseTo(0.8 * Math.pow(0.95, 2), 6);
  });

  it("applies a confidence floor", () => {
    // Aggressive disuse + heavy decay, but floored at 0.25
    const r = computeDecayedConfidence({
      ...baseArgs,
      confidence: 0.5,
      lastUsedAt: 100 * DAY_MS - 365 * DAY_MS,
      weeklyDecay: 0.5,
      floor: 0.25,
    });
    expect(r.newConfidence).toBe(0.25);
    expect(r.changed).toBe(true);
  });

  it("clamps input confidence above 1 to 1", () => {
    const r = computeDecayedConfidence({
      ...baseArgs,
      confidence: 1.5,
      lastUsedAt: 100 * DAY_MS - 37 * DAY_MS,
    });
    // Clamp to 1 first, then apply 0.95
    expect(r.newConfidence).toBeCloseTo(0.95, 6);
  });

  it("handles a brand-new memory (disuse = 0)", () => {
    const r = computeDecayedConfidence({
      ...baseArgs,
      creationTime: 100 * DAY_MS,
      lastUsedAt: undefined,
      nowMs: 100 * DAY_MS,
    });
    expect(r.changed).toBe(false);
    expect(r.weeksApplied).toBe(0);
  });

  it("returns changed=false when rounding noise keeps confidence constant", () => {
    // confidence already 0 → 0 * anything = 0, no change
    const r = computeDecayedConfidence({
      ...baseArgs,
      confidence: 0,
      lastUsedAt: 0,
    });
    expect(r.changed).toBe(false);
    expect(r.newConfidence).toBe(0);
  });
});

describe("applyUsageBoost", () => {
  it("adds boost within [0,1]", () => {
    expect(applyUsageBoost({ confidence: 0.5, boost: 0.02 })).toBeCloseTo(
      0.52,
      6
    );
  });

  it("clamps above 1", () => {
    expect(applyUsageBoost({ confidence: 0.95, boost: 0.2 })).toBe(1);
  });

  it("treats missing boost as 0", () => {
    expect(applyUsageBoost({ confidence: 0.5 })).toBe(0.5);
  });

  it("clamps negative confidence to 0 before boosting", () => {
    expect(applyUsageBoost({ confidence: -0.3, boost: 0.2 })).toBeCloseTo(
      0.2,
      6
    );
  });

  it("ignores negative boost (no decrement path)", () => {
    expect(applyUsageBoost({ confidence: 0.5, boost: -0.1 })).toBe(0.5);
  });
});
