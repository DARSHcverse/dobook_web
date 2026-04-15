import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("packages")
    .select("*, category:package_categories(id,name)")
    .eq("business_id", auth.business.id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ detail: "name is required" }, { status: 400 });

  const features = Array.isArray(body?.features)
    ? body.features.map((f) => String(f || "").trim()).filter(Boolean)
    : [];

  const record = {
    business_id: auth.business.id,
    category_id: body?.category_id ? String(body.category_id).trim() : null,
    name,
    description: String(body?.description || "").trim(),
    price: Number(body?.price || 0),
    duration_hours: Number(body?.duration_hours || 3),
    image_url: String(body?.image_url || "").trim(),
    features,
    is_active: body?.is_active !== false,
    sort_order: Number(body?.sort_order || 0),
  };

  const { data, error } = await auth.supabase
    .from("packages")
    .insert(record)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
