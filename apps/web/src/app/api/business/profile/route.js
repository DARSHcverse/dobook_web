import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";

export async function PUT(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const allowed = [
    "business_name",
    "phone",
    "business_address",
    "abn",
    "logo_url",
    "bank_name",
    "account_name",
    "bsb",
    "account_number",
    "payment_link",
  ];

  if (auth.mode === "supabase") {
    const updates = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? "";
    }

    const { data: updated, error } = await auth.supabase
      .from("businesses")
      .update(updates)
      .eq("id", auth.business.id)
      .select("*")
      .maybeSingle();

    if (error || !updated) {
      return NextResponse.json({ detail: error?.message || "Failed to update business" }, { status: 500 });
    }

    return NextResponse.json(auth.sanitizeBusiness(updated));
  }

  for (const key of allowed) {
    if (key in body) auth.business[key] = body[key] ?? "";
  }

  auth.saveDb(auth.db);
  return NextResponse.json(auth.sanitizeBusiness(auth.business));
}
