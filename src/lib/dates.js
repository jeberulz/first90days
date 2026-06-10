// Local-date helpers.
//
// `new Date().toISOString().split("T")[0]` is UTC, so using it for "today"
// gives the wrong date for anyone not on UTC — evenings west of UTC and
// mornings east of it land on the adjacent day, which corrupts reflection
// streaks, scheduled dates, and interaction logs. Always derive calendar
// dates through these helpers instead.

/**
 * Format a date as YYYY-MM-DD in the device's local timezone (or an
 * explicit IANA timezone when provided). en-CA formats as YYYY-MM-DD
 * natively, so no manual padding is needed.
 */
export function localDateYMD(date = new Date(), timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Local YYYY-MM-DD for `days` days from now (negative for the past). */
export function localDateYMDPlusDays(days, timeZone) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateYMD(d, timeZone);
}
