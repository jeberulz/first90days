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

import { addDays, diffCalendarDays, tzTodayYmd } from "./planDates.js";

/**
 * Count whole calendar days from `lastInteractionDate` (YYYY-MM-DD) to
 * `todayYmd`. Returns null when there's no recorded interaction.
 *
 * Pure YMD math — no Date object means no DST or tz drift around the
 * day boundary.
 */
export function daysSinceInteraction(stakeholder, todayYmd) {
  if (!stakeholder.lastInteractionDate) return null;
  if (typeof stakeholder.lastInteractionDate !== "string") return null;
  return diffCalendarDays(stakeholder.lastInteractionDate, todayYmd);
}

/**
 * Compute a health summary for a stakeholder.
 * @returns {{health: "none"|"green"|"yellow"|"red", daysSince: number|null, thresholds: {greenDays:number, yellowDays:number}}}
 */
export function computeHealth(stakeholder, todayYmd) {
  const thresholds = resolveThresholds(stakeholder);
  const daysSince = daysSinceInteraction(stakeholder, todayYmd);
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
 * Today's YYYY-MM-DD in the given IANA timezone. Re-exported here so
 * stakeholder callers can stay inside this module and still get a
 * tz-aware "today".
 */
export function todayYmdInTz(tz) {
  return tzTodayYmd(tz);
}

/**
 * Compute the snooze target YYYY-MM-DD by adding `days` to today in the
 * user's timezone. Pure string math — DST-safe.
 */
export function snoozeUntilYmd(tz, days) {
  return addDays(tzTodayYmd(tz), days);
}

/**
 * True if nudges for this stakeholder should be suppressed on the given
 * tz-aware today.
 */
export function isSnoozed(stakeholder, todayYmd) {
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
