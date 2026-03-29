import { NextResponse } from "next/server";
import {
  buildAdminAccessCookie,
  hasValidAdminAccessCookie,
  hasValidAdminSessionCookie,
  requestHasValidAdminUrlKey,
} from "@/lib/adminAccess";

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

function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
}

function canonicalHost() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.do-book.com").trim();
  try {
    return new URL(siteUrl).host;
  } catch {
    return "www.do-book.com";
  }
}

function applyResponseSecurityHeaders(response, csp) {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export async function middleware(request) {
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
    const redirectResponse = NextResponse.redirect(dest, 308);
    return applyResponseSecurityHeaders(redirectResponse, buildContentSecurityPolicy());
  }

  const csp = buildContentSecurityPolicy();

  if (isAdminPath(path)) {
    if (await hasValidAdminSessionCookie(request)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("content-security-policy", csp);
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      return applyResponseSecurityHeaders(response, csp);
    }

    if (requestHasValidAdminUrlKey(request)) {
      const dest = url.clone();
      dest.pathname = "/admin";
      dest.search = "";
      const response = NextResponse.redirect(dest, 307);
      response.cookies.set(buildAdminAccessCookie());
      return applyResponseSecurityHeaders(response, csp);
    }

    if (hasValidAdminAccessCookie(request)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("content-security-policy", csp);
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      return applyResponseSecurityHeaders(response, csp);
    }

    console.warn(
      "Admin access blocked - unauthorized attempt:",
      request.nextUrl.pathname,
      new Date().toISOString(),
    );
    const blockedResponse = NextResponse.rewrite(new URL("/404", request.url));
    return applyResponseSecurityHeaders(blockedResponse, csp);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return applyResponseSecurityHeaders(response, csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
