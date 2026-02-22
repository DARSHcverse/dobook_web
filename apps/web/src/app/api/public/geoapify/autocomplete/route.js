import { NextResponse } from "next/server";

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

function normalizeQuery(value) {
  return String(value || "").trim();
}

export async function GET(request) {
  const apiKey = String(process.env.GEOAPIFY_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ detail: "GEOAPIFY_API_KEY is not set" }, { status: 400 });
  }

  const url = new URL(request.url);
  const text = normalizeQuery(url.searchParams.get("q"));
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") || 6)));
  if (text.length < 3) return NextResponse.json({ results: [], resultsCount: 0, limit, text });

  const lang = normalizeQuery(process.env.GEOAPIFY_LANGUAGE || "en") || "en";
  const countries = parseCountries(process.env.GEOAPIFY_COUNTRIES);

  const upstream = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  upstream.searchParams.set("text", text);
  upstream.searchParams.set("limit", String(limit));
  upstream.searchParams.set("apiKey", apiKey);
  if (lang) upstream.searchParams.set("lang", lang);

  // Geoapify supports restricting countries via `filter=countrycode:xx,yy`.
  if (countries?.length) {
    upstream.searchParams.set("filter", `countrycode:${countries.join(",")}`);
  }

  const res = await fetch(upstream.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) {
    let detail = `Geoapify error (${res.status})`;
    try {
      const json = await res.json();
      detail = json?.message || json?.error || detail;
    } catch {
      // ignore
    }
    return NextResponse.json({ detail }, { status: 502 });
  }

  const json = await res.json();
  const features = Array.isArray(json?.features) ? json.features : [];
  const results = features.map((f) => ({
    formatted: String(f?.properties?.formatted || "").trim(),
    properties: f?.properties || {},
  }));

  return NextResponse.json({
    results,
    resultsCount: results.length,
    limit,
    text,
  });
}

