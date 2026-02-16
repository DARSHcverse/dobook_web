import { NextResponse } from "next/server";

function canonicalHost() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.do-book.com").trim();
  try {
    return new URL(siteUrl).host;
  } catch {
    return "www.do-book.com";
  }
}

export function middleware(request) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl;

  const isVercelPreview = host.endsWith(".vercel.app");
  const isApex = host === "do-book.com";

  const path = url.pathname || "/";
  const isApi = path.startsWith("/api/");
  const isNext = path.startsWith("/_next/");

  if ((isVercelPreview || isApex) && !isApi && !isNext) {
    const dest = url.clone();
    dest.protocol = "https:";
    dest.host = canonicalHost();
    return NextResponse.redirect(dest, 308);
  }

  return NextResponse.next();
}

