import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const businessId = params?.businessId;
  if (!businessId) return NextResponse.json({ detail: "businessId required" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");

  const sb = supabaseAdmin();

  let query = sb
    .from("packages")
    .select("id,name,description,price,duration_hours,image_url,features,category_id,sort_order")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}
