import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function sha256Hex(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");

  if (!token) return NextResponse.json({ detail: "Token is required" }, { status: 400 });
  if (!password || password.length < 6) {
    return NextResponse.json({ detail: "Password must be at least 6 characters" }, { status: 400 });
  }

  const tokenHash = sha256Hex(token);
  const nowIso = new Date().toISOString();

  const sb = supabaseAdmin();
  const { data: row, error } = await sb
    .from("password_reset_tokens")
    .select("id,business_id,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error || !row) return NextResponse.json({ detail: "Invalid or expired reset link" }, { status: 400 });

  const password_hash = await bcrypt.hash(password, 10);

  await sb.from("businesses").update({ password_hash }).eq("id", row.business_id);
  await sb.from("password_reset_tokens").update({ used_at: nowIso }).eq("id", row.id);
  await sb.from("sessions").delete().eq("business_id", row.business_id);

  return NextResponse.json({ ok: true });
}

