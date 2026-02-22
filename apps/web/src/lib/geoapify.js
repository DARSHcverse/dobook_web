function parseCountries(envValue) {
  const raw = String(envValue || "").trim();
  if (!raw) return null;
  const parts = raw
    .split(/[,\s]+/g)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return null;
  return parts;
}

function clampNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

export function haversineDistanceKm(a, b) {
  const lat1 = clampNumber(a?.lat, NaN);
  const lon1 = clampNumber(a?.lon, NaN);
  const lat2 = clampNumber(b?.lat, NaN);
  const lon2 = clampNumber(b?.lon, NaN);
  if (![lat1, lon1, lat2, lon2].every((n) => Number.isFinite(n))) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sLat1 = toRad(lat1);
  const sLat2 = toRad(lat2);
  const aVal =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(sLat1) * Math.cos(sLat2) * (Math.sin(dLon / 2) ** 2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

export async function geocodeAddressGeoapify(address) {
  const apiKey = String(process.env.GEOAPIFY_API_KEY || "").trim();
  if (!apiKey) return null;

  const text = String(address || "").trim();
  if (text.length < 3) return null;

  const lang = String(process.env.GEOAPIFY_LANGUAGE || "en").trim() || "en";
  const countries = parseCountries(process.env.GEOAPIFY_COUNTRIES);

  const upstream = new URL("https://api.geoapify.com/v1/geocode/search");
  upstream.searchParams.set("text", text);
  upstream.searchParams.set("limit", "1");
  upstream.searchParams.set("apiKey", apiKey);
  if (lang) upstream.searchParams.set("lang", lang);
  if (countries?.length) upstream.searchParams.set("filter", `countrycode:${countries.join(",")}`);

  const res = await fetch(upstream.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const f = Array.isArray(json?.features) ? json.features[0] : null;
  const lat = clampNumber(f?.properties?.lat, NaN);
  const lon = clampNumber(f?.properties?.lon, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, formatted: String(f?.properties?.formatted || "").trim() };
}

export function extractLatLonFromAutocompleteItem(item) {
  const lat = clampNumber(item?.properties?.lat, NaN);
  const lon = clampNumber(item?.properties?.lon, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, formatted: String(item?.formatted || item?.properties?.formatted || "").trim() };
}

export async function drivingDistanceKmGeoapify(from, to) {
  const apiKey = String(process.env.GEOAPIFY_API_KEY || "").trim();
  if (!apiKey) return null;

  const aLat = clampNumber(from?.lat, NaN);
  const aLon = clampNumber(from?.lon, NaN);
  const bLat = clampNumber(to?.lat, NaN);
  const bLon = clampNumber(to?.lon, NaN);
  if (![aLat, aLon, bLat, bLon].every((n) => Number.isFinite(n))) return null;

  const upstream = new URL("https://api.geoapify.com/v1/routing");
  upstream.searchParams.set("waypoints", `${aLat},${aLon}|${bLat},${bLon}`);
  upstream.searchParams.set("mode", "drive");
  upstream.searchParams.set("apiKey", apiKey);

  const res = await fetch(upstream.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const f = Array.isArray(json?.features) ? json.features[0] : null;
  const meters = clampNumber(f?.properties?.distance, NaN);
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return meters / 1000;
}

