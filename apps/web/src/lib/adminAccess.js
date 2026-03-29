import { isOwnerEmail } from "@/lib/entitlements";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_ACCESS_TTL_SECONDS,
  ADMIN_COOKIE_NAME,
} from "@/lib/adminCookies";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function safeEqual(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right || left.length !== right.length) return false;

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

function padBase64(value) {
  const remainder = value.length % 4;
  if (!remainder) return value;
  return `${value}${"=".repeat(4 - remainder)}`;
}

function base64UrlToUint8Array(value) {
  const normalized = padBase64(String(value || "").replace(/-/g, "+").replace(/_/g, "/"));
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }

  return out;
}

function decodePayload(value) {
  try {
    return decoder.decode(base64UrlToUint8Array(value));
  } catch {
    return "";
  }
}

function getAdminUrlSecret() {
  return String(process.env.ADMIN_URL_SECRET || "").trim();
}

export function hasValidAdminAccessCookie(request) {
  const expected = getAdminUrlSecret();
  const actual = request.cookies.get(ADMIN_ACCESS_COOKIE_NAME)?.value || "";
  return safeEqual(actual, expected);
}

export function buildAdminAccessCookie() {
  const secret = getAdminUrlSecret();
  return {
    name: ADMIN_ACCESS_COOKIE_NAME,
    value: secret,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_ACCESS_TTL_SECONDS,
  };
}

export function clearAdminAccessCookie(response) {
  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

async function verifyAdminSignature(encodedPayload, signature, secret) {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    return crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToUint8Array(signature),
      encoder.encode(encodedPayload),
    );
  } catch {
    return false;
  }
}

export async function hasValidAdminSessionCookie(request) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value || "";
  const secret = String(process.env.ADMIN_SECRET || "").trim();
  if (!token || !secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [encodedPayload, signature] = parts;
  const signatureOk = await verifyAdminSignature(encodedPayload, signature, secret);
  if (!signatureOk) return false;

  let payload;
  try {
    payload = JSON.parse(decodePayload(encodedPayload));
  } catch {
    return false;
  }

  const email = String(payload?.email || "").trim().toLowerCase();
  const exp = Number(payload?.exp || 0);
  if (!email || !isOwnerEmail(email)) return false;
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  return true;
}

export function requestHasValidAdminUrlKey(request) {
  const expected = getAdminUrlSecret();
  const actual = request.nextUrl.searchParams.get("key") || "";
  return safeEqual(actual, expected);
}
