/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { classifyTask, isVagueTask } from "./lib/whispererClassifier.js";
import { validateResponse } from "./lib/whispererValidator.js";

import taskSizeFixture from "../tests/whisperer/fixtures/task-size.json";
import artifactShapeFixture from "../tests/whisperer/fixtures/artifact-shape.json";
import vagueFixture from "../tests/whisperer/fixtures/vague.json";
import piiFixture from "../tests/whisperer/fixtures/pii-validator.json";
import baseline from "../tests/whisperer/baseline.json";

/**
 * U9 eval suite — deterministic portion.
 *
 * Runs the heuristic-driven parts of the whisperer (task-size +
 * artifact-shape classifier, vague-task detector, PII validator
 * orchestration) against held-out fixtures and asserts each metric
 * stays at-or-above the locked baseline in tests/whisperer/baseline.json.
 *
 * The live-AI integration tests (AE1–AE3 prompt grading) live in
 * tests/whisperer/eval-runner.js and are NOT executed here — they
 * require ANTHROPIC_API_KEY / OPENAI_API_KEY and a small dollar
 * budget, so we keep them out of CI.
 */

function bundleFor(caseRow) {
  return {
    linkedStakeholder: caseRow.linkedStakeholder ? { name: "Stakeholder", role: "Role" } : null,
    linkedGoal: caseRow.linkedGoal ? { title: "Goal" } : null,
  };
}

function precisionRecall(actuals, predicteds, positiveLabel) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (let i = 0; i < actuals.length; i++) {
    const a = actuals[i] === positiveLabel;
    const p = predicteds[i] === positiveLabel;
    if (a && p) tp++;
    else if (!a && p) fp++;
    else if (a && !p) fn++;
  }
  return {
    precision: tp + fp === 0 ? 1 : tp / (tp + fp),
    recall: tp + fn === 0 ? 1 : tp / (tp + fn),
  };
}

/**
 * Deterministic substitute for the Haiku PII judge. Mirrors the
 * "fabrication" rule the real prompt enforces: if any of the
 * supplied facts is present in the response, that fact is grounded;
 * if a NAME appears in the response that isn't in the facts, that's
 * fabrication; if claims of tenure/personality/history appear, that's
 * fabrication. The judge is intentionally strict — it would over-flag
 * in production, which is fine for this orchestration eval (we want
 * to catch the validator's plumbing, not score the judge model).
 */
function deterministicJudge() {
  const fabricationPatterns = [
    /\b(\d+\s+(years?|months?))\b/i,         // tenure claims
    /\b(been (with|at|on)) the\b/i,           // tenure phrasing
    /\bskeptical of\b/i,                      // personality claims
    /\brocky transition\b/i,                  // history claims
    /\b(tends? to|likes|prefers|dislikes)\b/i, // personality
  ];

  const KNOWN_FIRST_NAMES = ["Marcus", "Priya", "Dana"];

  return async (_systemPrompt, userPrompt) => {
    const text = String(userPrompt || "");
    const factsBlock = text.match(/# Supplied stakeholder facts\n([\s\S]*?)\n# Candidate/);
    const facts = factsBlock ? factsBlock[1] : "";
    // Everything from the FIRST "# Candidate" header onwards — keeps
    // coaching_summary + artifact + clarifying_question sections in
    // scope so fabrication in any of them gets caught.
    const candIdx = text.indexOf("# Candidate");
    const candidate = candIdx >= 0 ? text.slice(candIdx) : "";

    const fabricated = [];
    for (const re of fabricationPatterns) {
      const m = candidate.match(re);
      if (m) fabricated.push(m[0]);
    }
    for (const name of KNOWN_FIRST_NAMES) {
      const namedInCandidate = new RegExp(`\\b${name}\\b`).test(candidate);
      const namedInFacts = new RegExp(`\\b${name}\\b`).test(facts);
      if (namedInCandidate && !namedInFacts) {
        fabricated.push(name);
      }
    }
    const ok = fabricated.length === 0;
    return {
      json: {
        ok,
        reason: ok ? "" : "Detected fabricated stakeholder fact.",
        fabricated,
      },
    };
  };
}

describe("U9 eval — task-size classifier", () => {
  it("meets the baseline precision/recall for the `small` label", () => {
    const cases = taskSizeFixture.cases;
    const actuals = cases.map((c) => c.size);
    const predicteds = cases.map(
      (c) => classifyTask(c, bundleFor(c)).size
    );

    const pr = precisionRecall(actuals, predicteds, "small");
    expect(pr.precision).toBeGreaterThanOrEqual(baseline.metrics.task_size_precision);
    expect(pr.recall).toBeGreaterThanOrEqual(baseline.metrics.task_size_recall);
  });
});

describe("U9 eval — artifact-shape classifier", () => {
  it("meets the baseline precision/recall for the `artifact` label", () => {
    const cases = artifactShapeFixture.cases;
    const actuals = cases.map((c) => c.shape);
    const predicteds = cases.map(
      (c) => classifyTask(c, bundleFor(c)).shape
    );

    const pr = precisionRecall(actuals, predicteds, "artifact");
    expect(pr.precision).toBeGreaterThanOrEqual(baseline.metrics.artifact_shape_precision);
    expect(pr.recall).toBeGreaterThanOrEqual(baseline.metrics.artifact_shape_recall);
  });
});

describe("U9 eval — vague-task escape rate (R6)", () => {
  it("flags vague tasks at-or-above the locked escape rate", () => {
    const cases = vagueFixture.cases;
    let hits = 0;
    let total = 0;
    for (const c of cases) {
      if (c.expectVague !== true) continue;
      total++;
      if (isVagueTask(c, bundleFor(c))) hits++;
    }
    const rate = total === 0 ? 1 : hits / total;
    expect(rate).toBeGreaterThanOrEqual(baseline.metrics.vague_escape_rate);
  });

  it("does NOT flag non-vague tasks (false positive guard)", () => {
    const cases = vagueFixture.cases;
    for (const c of cases) {
      if (c.expectVague === true) continue;
      expect(isVagueTask(c, bundleFor(c))).toBe(false);
    }
  });
});

describe("U9 eval — PII validator catch rate", () => {
  it("catches 100% of adversarial fabrication cases", async () => {
    const judge = deterministicJudge();
    const adversarial = piiFixture.cases.filter((c) => c.expected.ok === false);
    let caught = 0;
    for (const c of adversarial) {
      const verdict = await validateResponse(c.response, c.stakeholderFacts, judge);
      if (verdict.ok === false) caught++;
    }
    const rate = adversarial.length === 0 ? 1 : caught / adversarial.length;
    expect(rate).toBeGreaterThanOrEqual(baseline.metrics.pii_validator_catch_rate);
  });

  it("does not over-flag grounded responses", async () => {
    const judge = deterministicJudge();
    const grounded = piiFixture.cases.filter((c) => c.expected.ok === true);
    for (const c of grounded) {
      const verdict = await validateResponse(c.response, c.stakeholderFacts, judge);
      expect(verdict.ok).toBe(true);
    }
  });
});
