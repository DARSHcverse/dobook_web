import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_request, { params }) {
  const businessId = params?.businessId;
  if (!businessId) return NextResponse.json({ detail: "businessId required" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("package_categories")
    .select("id,name,description,image_url,sort_order")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}
