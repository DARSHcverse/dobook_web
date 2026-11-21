// Email verification for new business accounts.
//
// Why: spam signups with throwaway addresses (see dobook-signup-spam) created
// live booking pages. Unverified accounts can use the dashboard, but cannot
// take public bookings/enquiries or appear on Discover until they click the
// link. Existing accounts are backfilled as verified by the migration.
//
// Tokens are stateless: base64url(payload).HMAC-SHA256(payload). The payload
// binds the business id AND email, so changing the email voids old links.
import { createHmac, timingSafeEqual } from "node:crypto";
import { columnExists } from "@/lib/dbProbe";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const VERIFIED_COLUMN = "email_verified_at";

function secret() {
  return String(
    process.env.EMAIL_VERIFY_SECRET || process.env.ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  );
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  return createHmac("sha256", secret()).update(`email-verify:${payload}`).digest("base64url");
}

export function createEmailVerifyToken({ businessId, email, now = Date.now() }) {
  if (!secret()) throw new Error("No secret configured for email verification tokens");
  const payload = b64url(
    JSON.stringify({ b: String(businessId), e: String(email || "").trim().toLowerCase(), x: now + TOKEN_TTL_MS }),
  );
  return `${payload}.${sign(payload)}`;
}

// Returns { businessId, email } for a valid, unexpired token, otherwise null.
export function readEmailVerifyToken(token, { now = Date.now() } = {}) {
  const raw = String(token || "");
  const dot = raw.indexOf(".");
  if (dot <= 0 || !secret()) return null;
  const payload = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.b || !data?.e || !Number.isFinite(data?.x) || data.x < now) return null;
    return { businessId: String(data.b), email: String(data.e) };
  } catch {
    return null;
  }
}

export function buildEmailVerifyUrl({ site, businessId, email }) {
  const base = String(site || "").replace(/\/+$/, "");
  return `${base}/api/auth/verify-email?token=${encodeURIComponent(createEmailVerifyToken({ businessId, email }))}`;
}

// A business is unverified only when the column exists and is explicitly
// null. Before the migration runs the field is absent (undefined), and we
// must not lock every business out because of deployment order.
export function isEmailVerified(business) {
  if (!business) return false;
  if (!(VERIFIED_COLUMN in business)) return true;
  return Boolean(business[VERIFIED_COLUMN]);
}

// For queries that list columns explicitly: append the verification column
// only when the database has it, so the select never errors pre-migration.
export async function selectWithVerifiedColumn(sb, columns) {
  return (await columnExists(sb, "businesses", VERIFIED_COLUMN)) ? `${columns},${VERIFIED_COLUMN}` : columns;
}

export const UNVERIFIED_PUBLIC_MESSAGE =
  "This business is still setting up its booking page. Please contact them directly for now.";
