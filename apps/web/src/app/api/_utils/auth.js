import { NextResponse } from "next/server";
import { readDb, writeDb, sanitizeBusiness } from "@/lib/localdb";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnerEmail } from "@/lib/entitlements";

async function ensureOwnerAccessSupabase(sb, business) {
  if (!business) return business;
  if (!isOwnerEmail(business.email)) return business;
  if (String(business.account_role || "").trim().toLowerCase() === "owner") return business;

  const updates = { account_role: "owner", subscription_plan: "pro", subscription_status: "active" };
  const { data } = await sb.from("businesses").update(updates).eq("id", business.id).select("*").maybeSingle();
  return data || { ...business, ...updates };
}

function ensureOwnerAccessLocal(db, business) {
  if (!business) return business;
  if (!isOwnerEmail(business.email)) return business;
  if (String(business.account_role || "").trim().toLowerCase() === "owner") return business;
  business.account_role = "owner";
  business.subscription_plan = "pro";
  business.subscription_status = "active";
  writeDb(db);
  return business;
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

  if (!hasSupabaseConfig()) {
    const db = readDb();
    const session = db.sessions.find(
      (s) => s.token === token && (!s.expiresAt || Date.now() < s.expiresAt),
    );
    if (!session) return { error: unauthorized() };

    const business = db.businesses.find((b) => b.id === session.businessId);
    if (!business) return { error: unauthorized() };

    return {
      mode: "localdb",
      db,
      session,
      business: ensureOwnerAccessLocal(db, business),
      saveDb: (nextDb) => writeDb(nextDb),
      sanitizeBusiness,
    };
  }

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
    mode: "supabase",
    supabase: sb,
    session,
    business: await ensureOwnerAccessSupabase(sb, business),
    sanitizeBusiness,
  };
}
