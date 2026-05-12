#!/usr/bin/env node
/**
 * Whisperer live-AI eval runner.
 *
 * Runs the role × phase prompt grading fixtures against the real
 * Sonnet/Haiku stack so we can spot prompt or model regressions
 * before they reach users. Stays out of CI because it requires:
 *   - ANTHROPIC_API_KEY (or OPENAI_API_KEY) in env
 *   - A small dollar budget per run (~$0.30 per full sweep)
 *
 * Usage:
 *   node tests/whisperer/eval-runner.js              # full sweep
 *   node tests/whisperer/eval-runner.js --case em-p3-a
 *   node tests/whisperer/eval-runner.js --json       # machine output
 *
 * For every case in role-x-phase.json we build a context bundle,
 * invoke the same generateStructured helper the production action
 * uses, and emit a per-case row:
 *
 *   { id, ok, latencyMs, model, shape, missing_expectations: [...] }
 *
 * The `expect` field on each fixture is treated as a soft rubric —
 * we look for the listed substrings/heuristics in the model output
 * and report what's missing rather than asserting equality.
 *
 * This is a SMOKE check, not a regression gate. The hard CI gate is
 * the deterministic eval suite in convex/whisperer.eval.test.js.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const fixturesPath = path.join(__dirname, "fixtures", "role-x-phase.json");
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));

const args = process.argv.slice(2);
const caseFilter = args.includes("--case")
  ? args[args.indexOf("--case") + 1]
  : null;
const asJson = args.includes("--json");

if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
  console.error(
    "[eval-runner] No ANTHROPIC_API_KEY or OPENAI_API_KEY in env. " +
      "Set one and re-run; this script does NOT execute in CI."
  );
  process.exit(2);
}

async function main() {
  const { generateStructured } = await import(
    path.join(repoRoot, "convex", "lib", "ai.js")
  );
  const {
    HYBRID_RESPONSE_SCHEMA,
    WHISPERER_SYSTEM_PROMPT,
    buildHybridPrompt,
    buildClarifyingPrompt,
  } = await import(path.join(repoRoot, "convex", "lib", "whispererPrompts.js"));
  const { isVagueTask } = await import(
    path.join(repoRoot, "convex", "lib", "whispererClassifier.js")
  );

  const results = [];
  for (const c of fixtures.cases) {
    if (caseFilter && c.id !== caseFilter) continue;

    const bundle = {
      task: { title: c.task, description: "", category: "general" },
      user: {
        roleTitle: c.role,
        phaseNumber: c.phase,
        phaseName: `Phase ${c.phase}`,
      },
      linkedStakeholder: c.linkedStakeholder || null,
      linkedGoal: null,
      adjacentWeekTasks: [],
      recentReflections: [],
    };

    const vague = isVagueTask(bundle.task, bundle);
    const userPrompt = vague
      ? buildClarifyingPrompt(bundle)
      : buildHybridPrompt(bundle, "coaching");

    const started = Date.now();
    let response;
    let err;
    try {
      response = await generateStructured(
        WHISPERER_SYSTEM_PROMPT,
        userPrompt,
        HYBRID_RESPONSE_SCHEMA
      );
    } catch (e) {
      err = e;
    }
    const latencyMs = Date.now() - started;

    if (err) {
      results.push({ id: c.id, ok: false, error: String(err.message || err), latencyMs });
      continue;
    }

    const parsed = response.json || {};
    const combined = [
      parsed.coaching_summary || "",
      parsed.artifact || "",
      parsed.clarifying_question || "",
    ]
      .join("\n")
      .toLowerCase();

    const missing = (c.expect || []).filter((hint) => {
      const phrase = hint.toLowerCase();
      if (phrase === "ends with ?") {
        return !(parsed.clarifying_question || "").trim().endsWith("?");
      }
      if (phrase.includes("names")) {
        const name = (c.linkedStakeholder && c.linkedStakeholder.name) || "";
        return name ? !combined.includes(name.toLowerCase()) : true;
      }
      return !combined.includes(
        phrase.replace(/^(produces|references|recommends|concrete) /, "")
      );
    });

    results.push({
      id: c.id,
      ok: missing.length === 0,
      latencyMs,
      model: response.model,
      shape: parsed.artifact ? "artifact" : parsed.clarifying_question ? "clarify" : "coaching",
      missing_expectations: missing,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ results, baselineAt: new Date().toISOString() }, null, 2));
    return;
  }

  for (const r of results) {
    const tag = r.ok ? "✓" : "✗";
    console.log(
      `${tag} ${r.id.padEnd(12)} ${String(r.shape || "?").padEnd(8)} ${r.latencyMs}ms` +
        (r.missing_expectations && r.missing_expectations.length
          ? `   missing: ${r.missing_expectations.join(", ")}`
          : "") +
        (r.error ? `   error: ${r.error}` : "")
    );
  }
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass} / ${results.length} cases met expectations`);
}

main().catch((err) => {
  console.error("[eval-runner]", err);
  process.exit(1);
});
