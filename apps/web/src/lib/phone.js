import { getCountryProfile } from "@/lib/countries";

export function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const plus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return plus ? `+${digits}` : digits;
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

  const localDigits = norm.length;
  const profile = countryCode ? getCountryProfile(countryCode) : null;
  const allowed = profile?.national_len;

  if (Array.isArray(allowed) && allowed.length) {
    return allowed.includes(localDigits);
  }
  // Unknown country: accept any plausible local length.
  return localDigits >= 7 && localDigits <= 12;
}

export function phoneValidationHint(countryCode) {
  const profile = countryCode ? getCountryProfile(countryCode) : null;
  if (profile?.dial) {
    const len = Array.isArray(profile.national_len) ? profile.national_len[0] : 9;
    return `Enter ${len} digits or include your country code (e.g. +${profile.dial}...).`;
  }
  return "Enter your local number, or include your country code (e.g. +44 20 7946 0958).";
}
