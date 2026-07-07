// Country → locale defaults. Single source of truth for deriving currency,
// phone dial rules, distance unit, and timezone from a business's country.
//
// national_len = the number of digits in a valid *local* (national) phone
// number, excluding the country/trunk prefix. Used for lenient local-format
// validation; E.164 (+...) numbers are validated separately.

export const DEFAULT_COUNTRY_CODE = "AU";

// Keep this list pragmatic (top markets); everything else falls back to a
// safe generic profile. Add rows as you expand.
export const COUNTRIES = {
  AU: { name: "Australia", currency: "aud", dial: "61", national_len: [9], distance_unit: "km", timezone: "Australia/Sydney" },
  US: { name: "United States", currency: "usd", dial: "1", national_len: [10], distance_unit: "mi", timezone: "America/New_York" },
  GB: { name: "United Kingdom", currency: "gbp", dial: "44", national_len: [10], distance_unit: "mi", timezone: "Europe/London" },
  CA: { name: "Canada", currency: "cad", dial: "1", national_len: [10], distance_unit: "km", timezone: "America/Toronto" },
  NZ: { name: "New Zealand", currency: "nzd", dial: "64", national_len: [8, 9], distance_unit: "km", timezone: "Pacific/Auckland" },
  IE: { name: "Ireland", currency: "eur", dial: "353", national_len: [9], distance_unit: "km", timezone: "Europe/Dublin" },
  IN: { name: "India", currency: "inr", dial: "91", national_len: [10], distance_unit: "km", timezone: "Asia/Kolkata" },
  SG: { name: "Singapore", currency: "sgd", dial: "65", national_len: [8], distance_unit: "km", timezone: "Asia/Singapore" },
  MY: { name: "Malaysia", currency: "myr", dial: "60", national_len: [9, 10], distance_unit: "km", timezone: "Asia/Kuala_Lumpur" },
  ZA: { name: "South Africa", currency: "zar", dial: "27", national_len: [9], distance_unit: "km", timezone: "Africa/Johannesburg" },
  AE: { name: "United Arab Emirates", currency: "aed", dial: "971", national_len: [9], distance_unit: "km", timezone: "Asia/Dubai" },
  DE: { name: "Germany", currency: "eur", dial: "49", national_len: [10, 11], distance_unit: "km", timezone: "Europe/Berlin" },
  FR: { name: "France", currency: "eur", dial: "33", national_len: [9], distance_unit: "km", timezone: "Europe/Paris" },
  ES: { name: "Spain", currency: "eur", dial: "34", national_len: [9], distance_unit: "km", timezone: "Europe/Madrid" },
  IT: { name: "Italy", currency: "eur", dial: "39", national_len: [9, 10], distance_unit: "km", timezone: "Europe/Rome" },
  NL: { name: "Netherlands", currency: "eur", dial: "31", national_len: [9], distance_unit: "km", timezone: "Europe/Amsterdam" },
  PT: { name: "Portugal", currency: "eur", dial: "351", national_len: [9], distance_unit: "km", timezone: "Europe/Lisbon" },
  BR: { name: "Brazil", currency: "brl", dial: "55", national_len: [10, 11], distance_unit: "km", timezone: "America/Sao_Paulo" },
  MX: { name: "Mexico", currency: "mxn", dial: "52", national_len: [10], distance_unit: "km", timezone: "America/Mexico_City" },
  JP: { name: "Japan", currency: "jpy", dial: "81", national_len: [10], distance_unit: "km", timezone: "Asia/Tokyo" },
};

// Generic fallback profile for any country not in the table above.
export const FALLBACK_PROFILE = {
  name: "",
  currency: "usd",
  dial: "",
  national_len: [7, 8, 9, 10, 11, 12],
  distance_unit: "km",
  timezone: "UTC",
};

export function normalizeCountryCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

// Always returns a usable profile. Unknown/empty codes get the fallback,
// but we tag the resolved code so callers know what they got.
export function getCountryProfile(value) {
  const code = normalizeCountryCode(value);
  if (code && COUNTRIES[code]) {
    return { code, ...COUNTRIES[code] };
  }
  return { code: code || DEFAULT_COUNTRY_CODE, ...FALLBACK_PROFILE };
}

// Options for a country <select> in the UI, sorted by name.
export function countryOptions() {
  return Object.entries(COUNTRIES)
    .map(([code, p]) => ({ code, name: p.name, currency: p.currency }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
