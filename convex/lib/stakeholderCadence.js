/**
 * Stakeholder cadence + health helpers.
 *
 * Relationship health is derived from the gap between "today" and the
 * stakeholder's last interaction date. Two inputs drive the thresholds:
 *   - stakeholder.cadenceDays — explicit user override, if set
 *   - stakeholder.priority   — "Must" / "Should" / other, the default
 *
 * Health buckets:
 *   none   → no interaction recorded yet
 *   green  → within the target cadence
 *   yellow → drifting (between green and yellow limits)
 *   red    → overdue (past yellow)
 *
 * Nudges are suppressed when stakeholder.nudgeSnoozedUntil >= today.
 */

/**
 * Resolve the cadence thresholds for a stakeholder.
 * @returns {{greenDays: number, yellowDays: number, source: "custom"|"priority"}}
 */
export function resolveThresholds(stakeholder) {
  if (
    typeof stakeholder.cadenceDays === "number" &&
    stakeholder.cadenceDays > 0
  ) {
    const green = Math.max(1, Math.round(stakeholder.cadenceDays));
    // Yellow = target * 1.75 (≈ one-and-three-quarter cadences of slack).
    const yellow = Math.max(green + 1, Math.round(green * 1.75));
    return { greenDays: green, yellowDays: yellow, source: "custom" };
  }
  if (stakeholder.priority === "Must") {
    return { greenDays: 5, yellowDays: 10, source: "priority" };
  }
  // "Should" and anything unspecified.
  return { greenDays: 7, yellowDays: 14, source: "priority" };
}

/**
 * Count whole days from `lastInteractionDate` (YYYY-MM-DD) to `now`.
 * Returns null when there's no recorded interaction.
 */
export function daysSinceInteraction(stakeholder, now = new Date()) {
  if (!stakeholder.lastInteractionDate) return null;
  const last = new Date(stakeholder.lastInteractionDate);
  if (Number.isNaN(last.getTime())) return null;
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compute a health summary for a stakeholder.
 * @returns {{health: "none"|"green"|"yellow"|"red", daysSince: number|null, thresholds: {greenDays:number, yellowDays:number}}}
 */
export function computeHealth(stakeholder, now = new Date()) {
  const thresholds = resolveThresholds(stakeholder);
  const daysSince = daysSinceInteraction(stakeholder, now);
  if (daysSince === null) {
    return { health: "none", daysSince: null, thresholds };
  }
  let health;
  if (daysSince <= thresholds.greenDays) health = "green";
  else if (daysSince <= thresholds.yellowDays) health = "yellow";
  else health = "red";
  return { health, daysSince, thresholds };
}

/**
 * Format `date` as a local YYYY-MM-DD so comparisons with
 * stakeholder.nudgeSnoozedUntil (also YYYY-MM-DD) are lexical-safe.
 */
export function toYmd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * True if nudges for this stakeholder should be suppressed today.
 */
export function isSnoozed(stakeholder, todayYmd = toYmd()) {
  const until = stakeholder.nudgeSnoozedUntil;
  if (!until) return false;
  return todayYmd <= until;
}

/**
 * Human-readable reason string for why a stakeholder is surfaced as a
 * nudge. `health` must already be computed. Returns null if no nudge.
 */
export function describeNudge(stakeholder, health, daysSince) {
  if (health === "red") {
    const days = daysSince ?? 0;
    return `${days} days since last check-in — overdue`;
  }
  if (health === "yellow") {
    const days = daysSince ?? 0;
    return `${days} days since last check-in — drifting`;
  }
  if (health === "none") {
    return "No check-ins logged yet";
  }
  return null;
}

/**
 * Ordering: red before yellow before none, then by most overdue first.
 */
export function compareNudgeUrgency(a, b) {
  const rank = { red: 0, yellow: 1, none: 2, green: 3 };
  const rankA = rank[a.health] ?? 4;
  const rankB = rank[b.health] ?? 4;
  if (rankA !== rankB) return rankA - rankB;
  const daysA = a.daysSince ?? -1;
  const daysB = b.daysSince ?? -1;
  return daysB - daysA;
}
