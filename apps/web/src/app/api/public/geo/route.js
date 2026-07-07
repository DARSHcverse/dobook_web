import { NextResponse } from "next/server";
import { normalizeCountryCode, DEFAULT_COUNTRY_CODE } from "@/lib/countries";

// Best-effort country detection for pre-filling the signup form.
// Uses Vercel's geo header when available; falls back to the default country.
export async function GET(request) {
  const header =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    "";
  const country_code = normalizeCountryCode(header) || DEFAULT_COUNTRY_CODE;
  return NextResponse.json({ country_code }, { headers: { "Cache-Control": "no-store" } });
}
