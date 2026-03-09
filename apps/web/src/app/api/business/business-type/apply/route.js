import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { applyBusinessTypeTemplateNoOverwrite } from "@/lib/businessTypeSeeder";
import { normalizeBusinessType } from "@/lib/businessTypeTemplates";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const business_type = normalizeBusinessType(body?.business_type);
  if (!business_type) {
    return NextResponse.json({ detail: "business_type is required" }, { status: 400 });
  }

  const result = await applyBusinessTypeTemplateNoOverwrite({
    sb: auth.supabase,
    businessId: auth.business.id,
    businessType: business_type,
  });

  if (!result?.ok) return NextResponse.json({ detail: result?.detail || "Failed to apply template" }, { status: 400 });
  return NextResponse.json(result);
}

