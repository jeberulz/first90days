/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { envelopeFromTurns } from "./envelopeFromTurns.js";

const thread = { _id: "thr_1", status: "open", turnCount: 3 };

function turn(seq, role, extras = {}) {
  return {
    _id: `turn_${seq}`,
    seq,
    role,
    content: extras.content ?? "",
    artifact: extras.artifact ?? "",
    clarifyingQuestion: extras.clarifyingQuestion ?? "",
    assumptions: extras.assumptions ?? [],
  };
}

describe("envelopeFromTurns", () => {
  it("returns null for an empty turns array", () => {
    expect(envelopeFromTurns(thread, [])).toBeNull();
  });

  it("returns null when no thread is supplied", () => {
    expect(envelopeFromTurns(null, [turn(0, "assistant", { content: "hi" })])).toBeNull();
  });

  it("returns null when only user turns exist", () => {
    const result = envelopeFromTurns(thread, [turn(0, "user", { content: "help" })]);
    expect(result).toBeNull();
  });

  it("returns an envelope projecting the most recent assistant turn", () => {
    const turns = [
      turn(0, "assistant", { content: "first coaching" }),
      turn(1, "user", { content: "follow up" }),
      turn(2, "assistant", { content: "second coaching", assumptions: ["a1"] }),
    ];
    const result = envelopeFromTurns(thread, turns);
    expect(result.status).toBe("ok");
    expect(result.coachingSummary).toBe("second coaching");
    expect(result.turnId).toBe("turn_2");
    expect(result.assumptions).toEqual(["a1"]);
    expect(result.resumed).toBe(true);
  });

  it("infers hybrid path when an artifact is present", () => {
    const turns = [
      turn(0, "assistant", { content: "summary", artifact: "Hi Marcus — agenda" }),
    ];
    const result = envelopeFromTurns(thread, turns);
    expect(result.path).toBe("hybrid");
    expect(result.artifact).toBe("Hi Marcus — agenda");
  });

  it("infers clarify path when a clarifying question is present", () => {
    const turns = [
      turn(0, "assistant", { content: "", clarifyingQuestion: "What's the goal?" }),
    ];
    const result = envelopeFromTurns(thread, turns);
    expect(result.path).toBe("clarify");
    expect(result.clarifyingQuestion).toBe("What's the goal?");
  });

  it("infers small path for short coaching with no artifact", () => {
    const turns = [
      turn(0, "assistant", { content: "Quick tip — read the doc first." }),
    ];
    const result = envelopeFromTurns(thread, turns);
    expect(result.path).toBe("small");
  });

  it("collapses an empty artifact string to undefined", () => {
    const longCoaching = "A".repeat(300);
    const turns = [
      turn(0, "assistant", { content: longCoaching, artifact: "" }),
    ];
    const result = envelopeFromTurns(thread, turns);
    expect(result.artifact).toBeUndefined();
    expect(result.path).toBe("hybrid");
  });
});
