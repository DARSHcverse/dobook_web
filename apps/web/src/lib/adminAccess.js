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

// A short, memorable entry path as an alternative to the long ?key= URL.
//
// Read from ADMIN_ENTRY_PATH rather than hardcoded, because this repo has a
// public remote — committing the path would publish the secret and defeat the
// point of having one. Unset means the feature is simply off.
//
// Note this is obscurity, not authentication: a path is weaker than the 256-bit
// key (it leaks into access logs, browser history and the Referer header of any
// outbound link). It only gets you to the admin LOGIN page — the owner-email
// login is what actually protects the data.
function getAdminEntryPath() {
  const raw = String(process.env.ADMIN_ENTRY_PATH || "").trim();
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function isAdminEntryPath(pathname) {
  const entry = getAdminEntryPath();
  if (!entry) return false;

  // Browsers percent-encode characters like @ and $ in the path, so the raw
  // pathname arrives as "/ad%40bookmn%241998booth". Compare the decoded form,
  // and also the raw one in case the path contains no special characters.
  const raw = String(pathname || "").replace(/\/+$/, "") || "/";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Malformed encoding — fall back to the raw value rather than throwing.
  }
  const want = entry.replace(/\/+$/, "") || "/";
  return safeEqual(decoded, want) || safeEqual(raw, want);
}
