// Distance formatting/conversion. Internally the system always stores and
// computes in kilometres (see geoapify.js). This converts to the business's
// preferred display unit (km or mi) at the edge.

const KM_PER_MILE = 1.609344;

export function normalizeDistanceUnit(value) {
  const u = String(value || "").trim().toLowerCase();
  return u === "mi" || u === "mile" || u === "miles" ? "mi" : "km";
}

export function kmToUnit(km, unit = "km") {
  const value = Number(km);
  if (!Number.isFinite(value)) return null;
  return normalizeDistanceUnit(unit) === "mi" ? value / KM_PER_MILE : value;
}

// Convert a distance in the business's unit back to km (for storage/calc).
export function unitToKm(distance, unit = "km") {
  const value = Number(distance);
  if (!Number.isFinite(value)) return null;
  return normalizeDistanceUnit(unit) === "mi" ? value * KM_PER_MILE : value;
}

// "12.4 km" / "7.7 mi"
export function formatDistance(km, unit = "km", { digits = 1 } = {}) {
  const converted = kmToUnit(km, unit);
  if (converted === null) return "";
  const label = normalizeDistanceUnit(unit);
  return `${converted.toFixed(digits)} ${label}`;
}

// Just the unit label, e.g. for "$X per km".
export function distanceUnitLabel(unit = "km") {
  return normalizeDistanceUnit(unit);
}
