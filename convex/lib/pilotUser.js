/** Primary pilot persona — seed data is authorized only for this address (server-enforced). */
export const PILOT_USER_EMAIL = "iseghohi.john@gmail.com";

/** Day 1 of the pilot 90-day plan (YYYY-MM-DD). Activities schedule from this date. */
export const PILOT_PLAN_START_DATE = "2026-05-11";

export function isPilotEmail(email) {
  if (!email || typeof email !== "string") return false;
  return email.trim().toLowerCase() === PILOT_USER_EMAIL.toLowerCase();
}
