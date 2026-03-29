import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_request, { params }) {
  const extractionId = params?.extractionId;
  if (!extractionId) return NextResponse.json({ detail: "Extraction ID required" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: extraction, error } = await sb
    .from("extractions")
    .select("*")
    .eq("id", extractionId)
    .maybeSingle();

  if (error || !extraction) return NextResponse.json({ detail: "Extraction not found" }, { status: 404 });

  return NextResponse.json(extraction);
}

