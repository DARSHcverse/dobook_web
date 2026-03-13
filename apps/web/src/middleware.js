import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

function buildContentSecurityPolicy() {
  const connectSrc = [
    "'self'",
    "https:",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
    "https://api.resend.com",
  ];
  const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  if (!isProd) {
    connectSrc.push("http:", "ws:", "wss:");
    scriptSrc.push("'unsafe-eval'");
  }

  const directives = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "img-src": ["'self'", "https:", "data:", "blob:"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'", "https:"],
    "font-src": ["'self'", "https:", "data:"],
    "connect-src": connectSrc,
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };

  return Object.entries(directives)
    .map(([directive, value]) => `${directive} ${value.join(" ")}`)
    .join("; ");
}

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

  const csp = buildContentSecurityPolicy();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
