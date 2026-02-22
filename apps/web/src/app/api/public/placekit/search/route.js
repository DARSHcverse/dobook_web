import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url);
  const next = new URL("/api/public/geoapify/autocomplete", url.origin);
  const q = url.searchParams.get("q");
  const max = url.searchParams.get("max");
  if (q) next.searchParams.set("q", q);
  if (max) next.searchParams.set("limit", max);
  return NextResponse.redirect(next.toString(), 302);
}

