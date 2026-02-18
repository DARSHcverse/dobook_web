export function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const plus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return plus ? `+${digits}` : digits;
}

// Accept either:
// - exactly 10 digits (local format)
// - E.164-ish: + plus 8-15 digits (country code + number)
export function isValidPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  const norm = normalizePhone(raw);
  if (!norm) return false;
  if (norm.startsWith("+")) {
    const digits = norm.slice(1);
    return digits.length >= 8 && digits.length <= 15;
  }
  return norm.length === 10;
}

export function phoneValidationHint() {
  return "Enter 10 digits or include country code (e.g. +61412345678).";
}

