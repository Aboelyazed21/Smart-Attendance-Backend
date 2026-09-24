// ============================================================
// SHARED AUTH VALIDATION
// Single source of truth for registration / profile /
// password rules. Used by auth, users, students and admin
// controllers so frontend, backend and database-facing code
// all agree. Backend is the final authority — never trust
// client-side validation alone.
// ============================================================

const PASSWORD_ERROR =
  "Password must be 8–12 characters and contain uppercase, lowercase, number, and special character.";

const PHONE_ERROR =
  "Phone number must start with 010, 011, or 012 and contain exactly 11 digits.";

const FIRST_NAME_ERROR =
  "Please enter a valid first name.";

const LAST_NAME_ERROR =
  "Please enter a valid last name.";

// Collapse repeated whitespace and trim. Preserves Arabic
// and English characters exactly as typed.
function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

// Unicode-aware human names (English + Arabic):
// 2-50 chars, letters/marks/spaces plus . ' - only,
// no digits, no "@", no URLs.
function isValidName(normalized) {
  const text = String(normalized || "");

  if (
    text.length < 2 ||
    text.length > 50
  ) {
    return false;
  }

  if (!/^(?:\p{L}.*){2,}$/u.test(text)) {
    return false;
  }

  if (/[0-9@]/.test(text)) {
    return false;
  }

  if (/https?:\/\//i.test(text)) {
    return false;
  }

  return /^[\p{L}\p{M} .'\-]+$/u.test(
    text
  );
}

// Strip common separators only. Leading "+" is preserved
// here; the Egyptian registration rule below decides.
function normalizePhone(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  let text = String(value).trim();

  text = text.replace(/[\s\-().]/g, "");

  text = text.replace(/\+(?=.*\+)/g, "");

  return text;
}

// Strict Egyptian mobile rule for student registration:
// 010XXXXXXXX / 011XXXXXXXX / 012XXXXXXXX (exactly 11).
function normalizeEgyptianPhone(value) {
  return normalizePhone(value);
}

function isValidEgyptianPhone(normalized) {
  return /^01[012][0-9]{8}$/.test(
    normalized || ""
  );
}

// Generic international shape (used only where an
// international number is explicitly acceptable).
function isValidPhone(normalized) {
  return /^\+?[0-9]{7,15}$/.test(
    normalized || ""
  );
}

// 8-12 chars with uppercase, lowercase, digit and one of
// ! @ # $ % ^ & * _ - . ?
function isValidPassword(value) {
  const text = String(value || "");

  if (
    text.length < 8 ||
    text.length > 12
  ) {
    return false;
  }

  return (
    /[A-Z]/.test(text) &&
    /[a-z]/.test(text) &&
    /[0-9]/.test(text) &&
    /[!@#$%^&*_\-.?]/.test(text)
  );
}

function passwordStrength(value) {
  const text = String(value || "");

  if (!text) {
    return "empty";
  }

  let score = 0;

  if (text.length >= 8) score += 1;
  if (/[A-Z]/.test(text)) score += 1;
  if (/[a-z]/.test(text)) score += 1;
  if (/[0-9]/.test(text)) score += 1;
  if (/[!@#$%^&*_\-.?]/.test(text))
    score += 1;

  if (text.length > 12) {
    return "weak";
  }

  if (score <= 2) return "weak";
  if (score <= 4) return "fair";

  return "strong";
}

function isEmailIdentifier(value) {
  return String(value || "").includes("@");
}

module.exports = {
  PASSWORD_ERROR,
  PHONE_ERROR,
  FIRST_NAME_ERROR,
  LAST_NAME_ERROR,
  normalizeName,
  isValidName,
  normalizePhone,
  normalizeEgyptianPhone,
  isValidEgyptianPhone,
  isValidPhone,
  isValidPassword,
  passwordStrength,
  isEmailIdentifier,
};
