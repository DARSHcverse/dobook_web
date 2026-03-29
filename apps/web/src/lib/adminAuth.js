import "server-only";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_TOKEN_TTL_SECONDS } from "@/lib/adminCookies";
import { isOwnerEmail } from "@/lib/entitlements";

export { ADMIN_COOKIE_NAME, ADMIN_TOKEN_TTL_SECONDS } from "@/lib/adminCookies";

function getAdminSecret() {
  return String(process.env.ADMIN_SECRET || "").trim();
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function readCookieValue(cookieHeader, name) {
  if (!cookieHeader || !name) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    if (key !== name) continue;
    return rest.join("=").trim() || "";
  }
  return null;
}

export function createAdminToken({ email }) {
  const secret = getAdminSecret();
  if (!secret) return null;

  const now = Date.now();
  const payload = {
    email: String(email || "").trim().toLowerCase(),
    iat: now,
    exp: now + ADMIN_TOKEN_TTL_SECONDS * 1000,
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyAdminToken(token) {
  const secret = getAdminSecret();
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!token) return { ok: false, reason: "missing_token" };

  const parts = String(token).split(".");
  if (parts.length !== 2) return { ok: false, reason: "bad_format" };

  const [encoded, sig] = parts;
  const expected = sign(encoded, secret);
  if (!safeEqual(expected, sig)) return { ok: false, reason: "bad_signature" };

  const raw = base64UrlDecode(encoded);
  if (!raw) return { ok: false, reason: "bad_payload" };

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "bad_payload" };
  }

  const email = String(payload?.email || "").trim().toLowerCase();
  if (!email || !isOwnerEmail(email)) return { ok: false, reason: "not_owner" };

  const exp = Number(payload?.exp || 0);
  if (!Number.isFinite(exp) || exp <= Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, email, exp };
}

export function buildAdminCookie({ email }) {
  const token = createAdminToken({ email });
  if (!token) return null;

  return {
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TOKEN_TTL_SECONDS,
  };
}

export function clearAdminCookie(response) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
}

export function requireAdminAuth(request) {
  const cookieHeader = request?.headers?.get?.("cookie") || "";
  const token = readCookieValue(cookieHeader, ADMIN_COOKIE_NAME);
  const verified = verifyAdminToken(token);
  if (!verified.ok) {
    return { error: NextResponse.json({ detail: "Unauthorized" }, { status: 401 }) };
  }
  return { email: verified.email };
}

export function getAdminSessionFromCookies(cookieStore) {
  const token = cookieStore?.get?.(ADMIN_COOKIE_NAME)?.value || "";
  return verifyAdminToken(token);
}
