import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnerEmail } from "@/lib/entitlements";

export function sanitizeBusiness(business) {
  // Never return password hashes to the client.
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...safe } = business || {};
  return safe;
}

async function ensureOwnerAccessSupabase(sb, business) {
  if (!business) return business;
  if (!isOwnerEmail(business.email)) return business;
  if (String(business.account_role || "").trim().toLowerCase() === "owner") return business;

  const updates = { account_role: "owner", subscription_plan: "pro", subscription_status: "active" };
  const { data } = await sb.from("businesses").update(updates).eq("id", business.id).select("*").maybeSingle();
  return data || { ...business, ...updates };
}

export function unauthorized(detail = "Not authenticated") {
  return NextResponse.json({ detail }, { status: 401 });
}

export function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function requireSession(request) {
  const token = getBearerToken(request);
  if (!token) return { error: unauthorized() };

  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: session, error: sessionError } = await sb
    .from("sessions")
    .select("token,business_id,created_at,expires_at")
    .eq("token", token)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (sessionError || !session) return { error: unauthorized() };

  const { data: business, error: businessError } = await sb
    .from("businesses")
    .select("*")
    .eq("id", session.business_id)
    .maybeSingle();

  if (businessError || !business) return { error: unauthorized() };

  return {
    mode: "supabase", // Kept just in case other things check for mode
    supabase: sb,
    session,
    business: await ensureOwnerAccessSupabase(sb, business),
    saveDb: async () => {}, // No-op for backwards compatibility in case it's called
    sanitizeBusiness,
  };
}
