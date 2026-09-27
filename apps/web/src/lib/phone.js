import { getCountryProfile } from "@/lib/countries";

export function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const plus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return plus ? `+${digits}` : digits;
}

// Removes a single leading national trunk prefix ("0" in AU/GB/IN/LK/DE and
// most of the world). Only strips when something remains, so "0" alone is not
// silently turned into an empty number.
function stripTrunkPrefix(digits) {
  return digits.length > 1 && digits.startsWith("0") ? digits.slice(1) : digits;
}

// Country-aware phone validation.
//
// Accepts either:
// - E.164-ish: `+` plus 8-15 digits (country code + number) — always allowed.
// - Local format: digit count must match the country's national length.
//   When no country is given (or an unknown one), we accept any plausible
//   local length (7-12 digits) so we never wrongly reject a valid number.
//
// Backward compatible: isValidPhone(value) with no country behaves leniently.
export function isValidPhone(value, countryCode) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  const norm = normalizePhone(raw);
  if (!norm) return false;

  if (norm.startsWith("+")) {
    const digits = norm.slice(1);
    return digits.length >= 8 && digits.length <= 15;
  }

  const profile = countryCode ? getCountryProfile(countryCode) : null;
  const allowed = profile?.national_len;

  if (Array.isArray(allowed) && allowed.length) {
    // Accept the number with or without a national trunk prefix. Australians
    // write 0412 345 678, Britons 07911 123456 — the leading 0 is how people
    // actually type their own number, but national_len counts the digits
    // *after* it. Rejecting the everyday format blocked real signups.
    return allowed.includes(norm.length) || allowed.includes(stripTrunkPrefix(norm).length);
  }
  // Unknown country: accept any plausible local length.
  return norm.length >= 7 && norm.length <= 12;
}

export function phoneValidationHint(countryCode) {
  const profile = countryCode ? getCountryProfile(countryCode) : null;
  if (profile?.dial) {
    const len = Array.isArray(profile.national_len) ? profile.national_len[0] : 9;
    // Mention the everyday local form (with its trunk 0) as well as E.164 —
    // telling someone to "enter 9 digits" when their own number is 10 with the
    // leading zero reads as a bug rather than guidance.
    return `Enter your ${len}-digit local number (a leading 0 is fine) or include your country code (e.g. +${profile.dial}...).`;
  }
  return "Enter your local number, or include your country code (e.g. +44 20 7946 0958).";
}
