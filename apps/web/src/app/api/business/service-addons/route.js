import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

function asMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function asInt(value, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value) {
  if (value === true || value === false) return value;
  const s = String(value || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("service_addons")
    .select("*")
    .eq("business_id", auth.business.id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function PUT(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const input = Array.isArray(body) ? body : Array.isArray(body?.addons) ? body.addons : null;
  if (!input) return NextResponse.json({ detail: "addons array is required" }, { status: 400 });

  const rows = input
    .map((a, i) => {
      const name = String(a?.name || "").trim();
      if (!name) return null;
      return {
        business_id: auth.business.id,
        name,
        description: String(a?.description || "").trim(),
        price: asMoney(a?.price),
        duration_extra_mins: Math.max(0, asInt(a?.duration_extra_mins, 0)),
        is_active: a?.is_active === undefined ? true : asBool(a?.is_active),
        sort_order: Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : i * 10,
      };
    })
    .filter(Boolean);

  const { error: delErr } = await auth.supabase.from("service_addons").delete().eq("business_id", auth.business.id);
  if (delErr) return NextResponse.json({ detail: delErr.message }, { status: 500 });

  if (rows.length) {
    const { error: insErr } = await auth.supabase.from("service_addons").insert(rows);
    if (insErr) return NextResponse.json({ detail: insErr.message }, { status: 400 });
  }

  return GET(request);
}

