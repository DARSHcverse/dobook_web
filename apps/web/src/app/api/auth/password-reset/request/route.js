import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";
import { readDb, writeDb } from "@/lib/localdb";
import { sendPasswordResetEmail } from "@/lib/passwordResetMailer";

export const runtime = "nodejs";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://www.do-book.com";
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function tooSoon(lastCreatedAtIso) {
  if (!lastCreatedAtIso) return false;
  const t = new Date(lastCreatedAtIso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 2 * 60 * 1000;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ detail: "Email is required" }, { status: 400 });

  const site = resolveSiteUrl();
  const okResponse = NextResponse.json({ ok: true });

  // Always respond ok (avoid leaking which emails exist).
  try {
    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      const { data: business } = await sb.from("businesses").select("id,business_name,email").eq("email", email).maybeSingle();
      if (!business) return okResponse;

      const { data: recent } = await sb
        .from("password_reset_tokens")
        .select("created_at")
        .eq("business_id", business.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (tooSoon(recent?.[0]?.created_at)) return okResponse;

      await sb.from("password_reset_tokens").delete().eq("business_id", business.id).is("used_at", null);

      const token = randomUUID();
      const token_hash = sha256Hex(token);
      const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await sb.from("password_reset_tokens").insert({
        business_id: business.id,
        token_hash,
        expires_at,
        used_at: null,
      });

      const resetUrl = `${site}/auth?reset=1&token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({ to: email, businessName: business.business_name, resetUrl });
      return okResponse;
    }

    const db = readDb();
    const business = (db.businesses || []).find((b) => String(b?.email || "").trim().toLowerCase() === email);
    if (!business) return okResponse;

    const tokens = Array.isArray(db.passwordResetTokens) ? db.passwordResetTokens : [];
    const mine = tokens
      .filter((t) => t.businessId === business.id && !t.usedAt)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    if (tooSoon(mine?.[0]?.createdAt)) return okResponse;

    db.passwordResetTokens = tokens.filter((t) => t.businessId !== business.id || t.usedAt);

    const token = randomUUID();
    db.passwordResetTokens.push({
      id: randomUUID(),
      businessId: business.id,
      tokenHash: sha256Hex(token),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      usedAt: null,
    });
    writeDb(db);

    const resetUrl = `${site}/auth?reset=1&token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ to: email, businessName: business.business_name, resetUrl });
  } catch {
    // ignore failures (still respond ok)
  }

  return okResponse;
}

