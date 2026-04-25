/**
 * Pure builders that turn a plan + goals + onboarding context into
 * a downloadable document. Deliberately dependency-free so they can
 * run in the browser from the cached Convex queries — no round-trip
 * to a server action.
 *
 * Two formats:
 *   - Markdown: human-readable roadmap, ideal to hand to a manager
 *     or paste into a doc. Uses checkboxes so status survives.
 *   - JSON: structured dump for archiving or re-importing later.
 *
 * Both include the onboarding context block at the top so the plan
 * can be understood in isolation without the app.
 */

const PHASE_LABELS = {
  1: { name: "Learn", desc: "Absorb context", days: "Days 1-30" },
  2: { name: "Contribute", desc: "Deliver value", days: "Days 31-60" },
  3: { name: "Lead", desc: "Own outcomes", days: "Days 61-90" },
};

// GFM only recognises `[ ]` and `[x]` checkboxes. We render skipped
// activities as an unchecked box and strike the title through so any
// renderer (GitHub, Obsidian, Notion) shows them as intentionally
// dropped without breaking the task list.
const STATUS_CHECKBOX = {
  completed: "[x]",
  upcoming: "[ ]",
  skipped: "[ ]",
  in_progress: "[ ]",
};

function safeString(s, fallback = "") {
  if (typeof s !== "string") return fallback;
  return s.trim() || fallback;
}

function formatDate(ymd) {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Build a markdown representation. Shape:
 *   # Title
 *   Metadata block
 *   ## Context (onboarding)
 *   ## Goals (grouped by target phase)
 *   ## Plan
 *     ### Phase N
 *       #### Week K · theme
 *         - activities as checkboxes
 */
export function buildPlanMarkdown({ plan, goals, onboarding, exportedAt }) {
  // Defensive defaults — callers pass plan/goals straight from Convex
  // queries, which can race-return with missing sub-arrays during the
  // first paint after a regenerate. Coerce to safe shapes so the builder
  // can't crash the download flow on an in-flight plan.
  const safePlan = plan ?? {};
  const safeActivities = Array.isArray(safePlan.activities)
    ? safePlan.activities
    : [];
  const safePhases = Array.isArray(safePlan.phases) ? safePlan.phases : [];
  const safeWeeks = Array.isArray(safePlan.weeks) ? safePlan.weeks : [];
  const safeGoals = Array.isArray(goals) ? goals : [];

  const lines = [];
  const role = safeString(onboarding?.roleTitle, "New role");
  const company = safeString(onboarding?.companyName, "");
  const start = onboarding?.startDate;

  lines.push(
    `# 90-Day Plan: ${role}${company ? ` @ ${company}` : ""}`
  );
  lines.push("");
  const meta = [];
  if (start) meta.push(`**Start date:** ${formatDate(start)}`);
  meta.push(
    `**Exported:** ${(exportedAt || new Date()).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`
  );
  meta.push(`**Activities:** ${safeActivities.length} across 12 weeks`);
  lines.push(meta.join(" · "));
  lines.push("");

  // ── Context block ───────────────────────────────────────────────
  if (onboarding) {
    lines.push("## Context");
    lines.push("");
    const ctxRows = [
      ["Role type", onboarding.roleType],
      ["Function", onboarding.function_],
      ["Experience", `${onboarding.experienceYears ?? "?"} years`],
      ["First at level", onboarding.isFirstRoleAtLevel ? "Yes" : "No"],
      [
        "Team",
        [
          onboarding.teamSize != null ? `${onboarding.teamSize} people` : null,
          onboarding.isNewTeam ? "new team" : null,
        ]
          .filter(Boolean)
          .join(", ") || "—",
      ],
      ["Company size", onboarding.companySize],
      ["Company stage", onboarding.companyStage],
      ["Work model", onboarding.workModel],
      ["Industry", onboarding.industry],
      ["STARS situation", onboarding.starsSituation],
      ["Reports to", onboarding.reportsTo],
    ];
    for (const [k, v] of ctxRows) {
      if (v) lines.push(`- **${k}:** ${v}`);
    }
    if (safeString(onboarding.successDefinition)) {
      lines.push("");
      lines.push("**Success definition:**");
      lines.push(`> ${onboarding.successDefinition.replace(/\n/g, "\n> ")}`);
    }
    if (safeString(onboarding.challenges)) {
      lines.push("");
      lines.push("**Known challenges:**");
      lines.push(`> ${onboarding.challenges.replace(/\n/g, "\n> ")}`);
    }
    lines.push("");
  }

  // ── Goals grouped by phase ──────────────────────────────────────
  if (safeGoals.length > 0) {
    lines.push("## Goals");
    lines.push("");
    for (const phaseNum of [1, 2, 3]) {
      const pg = safeGoals.filter((g) => g.targetPhase === phaseNum);
      if (pg.length === 0) continue;
      const label = PHASE_LABELS[phaseNum];
      lines.push(`### Phase ${phaseNum} · ${label.name}`);
      lines.push("");
      for (const g of pg) {
        const box = g.status === "completed" ? "[x]" : "[ ]";
        const parts = [`- ${box} **${safeString(g.title, "Goal")}**`];
        if (g.category) parts.push(`_(${g.category})_`);
        if (g.approvalStatus === "approved") parts.push("✓ approved");
        else if (g.approvalStatus === "requested") parts.push("⌛ approval requested");
        lines.push(parts.join(" "));
      }
      lines.push("");
    }
  }

  // ── Plan body: phases → weeks → activities ──────────────────────
  lines.push("## Plan");
  lines.push("");

  const phases = [...safePhases].sort((a, b) => a.number - b.number);
  const weeksByPhase = {};
  for (const w of safeWeeks) {
    if (!weeksByPhase[w.phaseId]) weeksByPhase[w.phaseId] = [];
    weeksByPhase[w.phaseId].push(w);
  }
  const activitiesByWeek = {};
  for (const a of safeActivities) {
    if (!activitiesByWeek[a.weekNumber]) activitiesByWeek[a.weekNumber] = [];
    activitiesByWeek[a.weekNumber].push(a);
  }

  for (const phase of phases) {
    const label = PHASE_LABELS[phase.number];
    lines.push(
      `### Phase ${phase.number}: ${phase.name} · ${label?.days || ""}`
    );
    lines.push("");
    if (safeString(phase.milestone)) {
      lines.push(`**Milestone:** ${phase.milestone}`);
      lines.push("");
    }

    const phaseWeeks = (weeksByPhase[phase._id] || []).sort(
      (a, b) => a.number - b.number
    );
    for (const week of phaseWeeks) {
      lines.push(`#### Week ${week.number} · ${safeString(week.theme, "")}`);
      lines.push("");

      const acts = (activitiesByWeek[week.number] || []).sort(
        (a, b) => (a.scheduledDay || 0) - (b.scheduledDay || 0)
      );
      if (acts.length === 0) {
        lines.push("_No activities scheduled._");
        lines.push("");
        continue;
      }
      for (const a of acts) {
        const box = STATUS_CHECKBOX[a.status] || "[ ]";
        const rawTitle = safeString(a.title, "Activity");
        // Skipped → strike the title through so reviewers can tell at
        // a glance the user intentionally dropped it.
        const title =
          a.status === "skipped"
            ? `~~${rawTitle}~~`
            : `**${rawTitle}**`;
        lines.push(`- ${box} ${title}`);
        if (safeString(a.description)) {
          lines.push(`  ${a.description}`);
        }
        const chips = [];
        if (a.category) chips.push(a.category);
        if (a.priority) chips.push(`priority: ${a.priority}`);
        if (a.estimatedTime) chips.push(a.estimatedTime);
        if (a.scheduledDay) chips.push(`day ${a.scheduledDay}`);
        if (chips.length > 0) {
          lines.push(`  _${chips.join(" · ")}_`);
        }
        if (a.status === "completed" && safeString(a.completionNotes)) {
          lines.push(`  ✓ ${a.completionNotes}`);
        }
        if (a.status === "skipped" && safeString(a.skipReason)) {
          lines.push(`  _Skipped: ${a.skipReason}_`);
        }
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("_Generated by Arcora_");

  return lines.join("\n");
}

/**
 * Build a JSON blob — full structured dump. Keeps the Convex ids so
 * an eventual re-import path could re-link things if we build one.
 */
export function buildPlanJson({ plan, goals, onboarding, exportedAt }) {
  const safePlan = plan ?? {};
  const safeActivities = Array.isArray(safePlan.activities)
    ? safePlan.activities
    : [];
  const safePhases = Array.isArray(safePlan.phases) ? safePlan.phases : [];
  const safeWeeks = Array.isArray(safePlan.weeks) ? safePlan.weeks : [];
  const safeGoals = Array.isArray(goals) ? goals : [];

  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: (exportedAt || new Date()).toISOString(),
      onboarding: onboarding || null,
      plan: {
        _id: safePlan._id,
        status: safePlan.status,
        overallCompletion: safePlan.overallCompletion,
        phases: [...safePhases]
          .sort((a, b) => a.number - b.number)
          .map((p) => ({
            _id: p._id,
            number: p.number,
            name: p.name,
            startDay: p.startDay,
            endDay: p.endDay,
            milestone: p.milestone,
            status: p.status,
            milestoneAcknowledgedAt: p.milestoneAcknowledgedAt ?? null,
          })),
        weeks: [...safeWeeks]
          .sort((a, b) => a.number - b.number)
          .map((w) => ({
            _id: w._id,
            phaseId: w.phaseId,
            number: w.number,
            theme: w.theme,
            reflectionPrompt: w.reflectionPrompt,
            reviewQuestions: w.reviewQuestions,
          })),
        activities: safeActivities.map((a) => ({
          _id: a._id,
          weekId: a.weekId,
          weekNumber: a.weekNumber,
          title: a.title,
          description: a.description,
          category: a.category,
          subcategory: a.subcategory ?? null,
          estimatedTime: a.estimatedTime,
          priority: a.priority,
          scheduledDay: a.scheduledDay ?? null,
          scheduledDate: a.scheduledDate ?? null,
          status: a.status,
          completedAt: a.completedAt ?? null,
          completionNotes: a.completionNotes ?? null,
          skipReason: a.skipReason ?? null,
          isCustom: a.isCustom,
          source: a.source,
        })),
      },
      goals: safeGoals.map((g) => ({
        _id: g._id,
        title: g.title,
        targetPhase: g.targetPhase,
        category: g.category,
        status: g.status,
        completedAt: g.completedAt ?? null,
        notes: g.notes ?? null,
        approvalStatus: g.approvalStatus ?? "none",
      })),
    },
    null,
    2
  );
}

/**
 * Build a filename slug from role + company + today. Example:
 *   "90day-plan-senior-pm-acme-2026-04-13.md"
 */
export function buildExportFilename({ onboarding, extension, now }) {
  const d = now || new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const slug = [onboarding?.roleTitle, onboarding?.companyName]
    .filter((s) => typeof s === "string" && s.trim())
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const base = slug ? `90day-plan-${slug}-${ymd}` : `90day-plan-${ymd}`;
  return `${base}.${extension}`;
}

/**
 * Trigger a browser download for a text payload. Uses the standard
 * anchor-click pattern — no library, no server round-trip. Safe to
 * call multiple times in a row because the object URL is revoked
 * after the anchor click.
 */
export function downloadTextFile({ filename, mimeType, content }) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so Safari has time to pick up the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
