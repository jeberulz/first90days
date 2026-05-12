/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { classifyTask, isVagueTask } from "./whispererClassifier.js";

const stakeholderBundle = {
  linkedStakeholder: { name: "Marcus", role: "PM" },
  linkedGoal: null,
};

const emptyBundle = { linkedStakeholder: null, linkedGoal: null };

describe("isVagueTask", () => {
  it("flags short titles with no linkage", () => {
    expect(isVagueTask({ title: "Plan week" }, emptyBundle)).toBe(true);
  });

  it("does not flag short titles when a stakeholder is linked", () => {
    expect(isVagueTask({ title: "Plan week" }, stakeholderBundle)).toBe(false);
  });

  it("does not flag long titles even with no linkage", () => {
    expect(
      isVagueTask(
        { title: "Draft a 1:1 agenda for next Monday with the team lead" },
        emptyBundle
      )
    ).toBe(false);
  });
});

describe("classifyTask", () => {
  it("routes vague tasks to clarify shape", () => {
    const out = classifyTask({ title: "Plan week" }, emptyBundle);
    expect(out.size).toBe("full");
    expect(out.shape).toBe("clarify");
  });

  it("classifies short low-friction tasks as small", () => {
    const out = classifyTask(
      { title: "Read primer", estimatedTime: "10m" },
      stakeholderBundle
    );
    expect(out.size).toBe("small");
  });

  it("classifies artifact-shaped tasks as full + artifact", () => {
    const out = classifyTask(
      { title: "Draft 1:1 agenda for Marcus", estimatedTime: "30m" },
      stakeholderBundle
    );
    expect(out.size).toBe("full");
    expect(out.shape).toBe("artifact");
  });

  it("defaults ambiguous full tasks to coaching shape", () => {
    const out = classifyTask(
      {
        title: "Sync with Marcus about the migration roadmap",
        estimatedTime: "45m",
      },
      stakeholderBundle
    );
    expect(out.size).toBe("full");
    expect(["coaching", "artifact"]).toContain(out.shape);
  });
});
