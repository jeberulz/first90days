/**
 * Display helpers for Convex viewer-shaped users (firstName, lastName, name, email).
 */

/** Split a full display string into first + last (first word / remainder). */
export function splitFullNameDisplay(fullName) {
  if (!fullName?.trim()) return { first: "", last: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function displayName(user) {
  if (!user) return "";
  const f = user.firstName?.trim();
  const l = user.lastName?.trim();
  if (f || l) return [f, l].filter(Boolean).join(" ");
  return user.name?.trim() || "";
}

/** First name for greetings; firstName field, else first token of full name (no email fallback). */
export function preferredFirstName(user) {
  if (!user) return "";
  const f = user.firstName?.trim();
  if (f) return f;
  const full = user.name?.trim();
  if (full) return full.split(/\s+/)[0] ?? "";
  return "";
}

export function userInitials(user) {
  if (!user) return "?";
  const f = user.firstName?.trim();
  const l = user.lastName?.trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  const d = displayName(user);
  if (d) {
    return d
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  const emailUser = user.email?.split("@")[0] ?? "";
  return (emailUser[0] || "?").toUpperCase();
}
