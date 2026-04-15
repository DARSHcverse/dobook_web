import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const packageId = params?.packageId;
  if (!packageId) return NextResponse.json({ detail: "packageId required" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const updates = {};
  if (body?.name !== undefined) updates.name = String(body.name).trim();
  if (body?.description !== undefined) updates.description = String(body.description).trim();
  if (body?.category_id !== undefined) updates.category_id = body.category_id ? String(body.category_id).trim() : null;
  if (body?.price !== undefined) updates.price = Number(body.price);
  if (body?.duration_hours !== undefined) updates.duration_hours = Number(body.duration_hours);
  if (body?.image_url !== undefined) updates.image_url = String(body.image_url).trim();
  if (body?.features !== undefined) {
    updates.features = Array.isArray(body.features)
      ? body.features.map((f) => String(f || "").trim()).filter(Boolean)
      : [];
  }
  if (body?.is_active !== undefined) updates.is_active = Boolean(body.is_active);
  if (body?.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

  const { data, error } = await auth.supabase
    .from("packages")
    .update(updates)
    .eq("id", packageId)
    .eq("business_id", auth.business.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ detail: "Package not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const packageId = params?.packageId;
  if (!packageId) return NextResponse.json({ detail: "packageId required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("packages")
    .delete()
    .eq("id", packageId)
    .eq("business_id", auth.business.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
