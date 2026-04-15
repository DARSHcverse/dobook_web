import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";

export async function PUT(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const categoryId = params?.categoryId;
  if (!categoryId) return NextResponse.json({ detail: "categoryId required" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const updates = {};
  if (body?.name !== undefined) updates.name = String(body.name).trim();
  if (body?.description !== undefined) updates.description = String(body.description).trim();
  if (body?.image_url !== undefined) updates.image_url = String(body.image_url).trim();
  if (body?.is_active !== undefined) updates.is_active = Boolean(body.is_active);
  if (body?.sort_order !== undefined) updates.sort_order = Number(body.sort_order);

  const { data, error } = await auth.supabase
    .from("package_categories")
    .update(updates)
    .eq("id", categoryId)
    .eq("business_id", auth.business.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ detail: "Category not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const categoryId = params?.categoryId;
  if (!categoryId) return NextResponse.json({ detail: "categoryId required" }, { status: 400 });

  const { error } = await auth.supabase
    .from("package_categories")
    .delete()
    .eq("id", categoryId)
    .eq("business_id", auth.business.id);

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
