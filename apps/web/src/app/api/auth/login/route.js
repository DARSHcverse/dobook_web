import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnerEmail } from "@/lib/entitlements";
import { sanitizeBusiness, SESSION_COOKIE } from "@/app/api/_utils/auth";

async function ensureOwnerAccessSupabase(sb, business) {
  if (!business) return business;
  if (!isOwnerEmail(business.email)) return business;
  if (String(business.account_role || "").trim().toLowerCase() === "owner") return business;

  const updates = { account_role: "owner", subscription_plan: "pro", subscription_status: "active" };
  const { data } = await sb.from("businesses").update(updates).eq("id", business.id).select("*").maybeSingle();
  return data || { ...business, ...updates };
}

export async function POST(request) {
  const body = await request.json();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  const sb = supabaseAdmin();
  const { data: business, error: businessError } = await sb
    .from("businesses")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (businessError || !business) {
    return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, business.password_hash || "");
  if (!ok) return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });

  const normalized = await ensureOwnerAccessSupabase(sb, business);

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expires_at = expiresAt.toISOString();

  const { error: sessionError } = await sb.from("sessions").insert({
    token,
    business_id: normalized.id,
    created_at: new Date().toISOString(),
    expires_at,
  });

  if (sessionError) {
    if (String(sessionError.message || "").toLowerCase().includes("row-level security")) {
      return NextResponse.json(
        {
          detail:
            "Supabase RLS blocked creating the session. Make sure your server uses the service_role key: set SUPABASE_SERVICE_ROLE_KEY (or SUBABASE_API_KEY) to the service_role key, not the anon key.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ detail: sessionError.message }, { status: 500 });
  }

  const response = NextResponse.json({ business: sanitizeBusiness(normalized) });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  return response;
}
