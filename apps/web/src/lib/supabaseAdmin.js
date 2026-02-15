import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  );
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length < 2) return null;
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  try {
    const raw = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function inferSupabaseKeyRole(key) {
  const payload = decodeJwtPayload(key);
  const role = payload?.role;
  return typeof role === "string" ? role : null;
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUBABASE_API_KEY ||
    process.env.SUPABASE_API_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

let _client;
export function supabaseAdmin() {
  if (_client) return _client;

  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const role = inferSupabaseKeyRole(key);
  if (role && role !== "service_role") {
    throw new Error(
      `Supabase key role is "${role}", but server routes require the service_role key when RLS is enabled. Set SUPABASE_SERVICE_ROLE_KEY (or SUBABASE_API_KEY) to your Supabase service_role key, and keep anon keys in NEXT_PUBLIC_SUPABASE_ANON_KEY only.`,
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
