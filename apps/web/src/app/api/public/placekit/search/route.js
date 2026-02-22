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

export async function GET(request) {
  const apiKey =
    process.env.PLACEKIT_API_KEY ||
    process.env.NEXT_PUBLIC_PLACEKIT_API_KEY ||
    process.env.PLACEKIT_PUBLIC_API_KEY ||
    "";

  if (!String(apiKey).trim()) {
    return NextResponse.json({ detail: "PLACEKIT_API_KEY is not set" }, { status: 400 });
  }

  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim();
  const maxResults = Math.min(10, Math.max(1, Number(url.searchParams.get("max") || 5)));
  if (query.length < 3) return NextResponse.json({ results: [], resultsCount: 0, maxResults, query });

  const countries = parseCountries(process.env.PLACEKIT_COUNTRIES);
  const language = String(process.env.PLACEKIT_LANGUAGE || "en").trim() || "en";

  const payload = {
    query,
    maxResults,
    ...(countries ? { countries } : {}),
    ...(language ? { language } : {}),
  };

  const res = await fetch("https://api.placekit.co/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-placekit-api-key": String(apiKey).trim(),
    },
    body: JSON.stringify(payload),
    // Keep it snappy; if PlaceKit is down, don't hang the UI.
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `PlaceKit error (${res.status})`;
    try {
      const json = await res.json();
      detail = json?.message || json?.error || detail;
    } catch {
      // ignore
    }
    return NextResponse.json({ detail }, { status: 502 });
  }

  const json = await res.json();
  return NextResponse.json(json);
}

