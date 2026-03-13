import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isLikelyEmail(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const raw = params?.email ? decodeURIComponent(params.email) : "";
  const email = normalizeEmail(raw);
  if (!isLikelyEmail(email)) {
    return NextResponse.json({ detail: "Valid email is required" }, { status: 400 });
  }

  const notes = typeof body?.notes === "string" ? body.notes : "";
  const payload = {
    business_id: auth.business.id,
    customer_email: email,
    notes,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await auth.supabase
      .from("client_notes")
      .upsert(payload, { onConflict: "business_id,customer_email" })
      .select("id,notes,updated_at")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      notes: data?.notes ?? notes,
      updated_at: data?.updated_at ?? payload.updated_at,
    });
  } catch (e) {
    const msg = String(e?.message || "").toLowerCase();
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return NextResponse.json(
        { detail: "Supabase table \"client_notes\" is missing. Run migrations to create it." },
        { status: 500 },
      );
    }
    return NextResponse.json({ detail: e?.message || "Failed to save notes" }, { status: 500 });
  }
}
