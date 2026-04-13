/** Project default when no user-specific timezone is set. */
export const DEFAULT_TIMEZONE = "Europe/London";

/** Resolve the timezone to use for a user, with UK default. */
export function resolveUserTimezone(user) {
  const tz = user?.settings?.timezone;
  return typeof tz === "string" && tz.length > 0 ? tz : DEFAULT_TIMEZONE;
}

/**
 * Today's calendar date in `tz` as "YYYY-MM-DD".
 * Uses Intl.DateTimeFormat so DST transitions are handled correctly.
 */
export function tzTodayYmd(tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

/**
 * Calendar-day arithmetic on "YYYY-MM-DD" strings using a UTC proxy.
 * We never expose a Date — the string representation IS the source of truth —
 * so the fact that we use UTC internally is an implementation detail that
 * does not depend on the runtime timezone.
 */
function parseYmdAsUtc(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtcAsYmd(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Shift `ymd` by `days` calendar days (may be negative). */
export function addDays(ymd, days) {
  const d = parseYmdAsUtc(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatUtcAsYmd(d);
}

/** Whole-day diff `endYmd - startYmd` (calendar days). */
export function diffCalendarDays(startYmd, endYmd) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round(
    (parseYmdAsUtc(endYmd).getTime() - parseYmdAsUtc(startYmd).getTime()) / MS
  );
}

/** Calendar YYYY-MM-DD for plan day N (day 1 = startDate). */
export function scheduleYmd(startDate, dayNumber) {
  return addDays(startDate, dayNumber - 1);
}
