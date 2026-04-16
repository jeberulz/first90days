// Shared password policy used by the signup, reset-password, and
// change-password flows. Keep in sync with the server-side check in
// convex/auth.js (validatePasswordRequirements). The server is the source
// of truth; this module exists so the UI can surface the same rules in
// real time rather than only after a round-trip error.

export const PASSWORD_MIN_LENGTH = 10;

// Short blocklist of the most common passwords. Not intended to be
// exhaustive — the server check catches the rest.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "qwerty",
  "qwerty123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
  "monkey",
  "dragon",
]);

export function passwordRequirements(password, email) {
  const pwd = password ?? "";
  const emailLower = (email ?? "").trim().toLowerCase();

  return [
    { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, passed: pwd.length >= PASSWORD_MIN_LENGTH },
    { id: "lower", label: "A lowercase letter", passed: /[a-z]/.test(pwd) },
    { id: "upper", label: "An uppercase letter", passed: /[A-Z]/.test(pwd) },
    { id: "digit", label: "A number", passed: /\d/.test(pwd) },
    { id: "special", label: "A special character (e.g. !?@#)", passed: /[^A-Za-z0-9]/.test(pwd) },
    {
      id: "notCommon",
      label: "Not a commonly-used password",
      passed: pwd.length === 0 ? false : !COMMON_PASSWORDS.has(pwd.toLowerCase()),
    },
    {
      id: "notEmail",
      label: "Different from your email",
      passed: pwd.length === 0 ? false : !emailLower || pwd.toLowerCase() !== emailLower,
    },
  ];
}

export function validatePasswordOrThrow(password, email) {
  const reqs = passwordRequirements(password, email);
  const failed = reqs.find((r) => !r.passed);
  if (failed) {
    throw new Error(failed.label);
  }
}

export function passwordStrength(password, email) {
  const reqs = passwordRequirements(password, email);
  const passed = reqs.filter((r) => r.passed).length;
  const total = reqs.length;
  if (password.length === 0) return { score: 0, level: "empty", passed, total };
  if (passed <= 3) return { score: passed / total, level: "weak", passed, total };
  if (passed <= 5) return { score: passed / total, level: "fair", passed, total };
  if (passed < total) return { score: passed / total, level: "good", passed, total };
  return { score: 1, level: "strong", passed, total };
}
