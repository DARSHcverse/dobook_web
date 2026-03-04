import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extractBookingDetailsFromText, extractTextFromPdfBuffer } from "@/lib/pdfExtract";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request) {
  const extraction_id = randomUUID();
  const sb = supabaseAdmin();

  let extracted_data = {};
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ detail: "file is required" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const text = extractTextFromPdfBuffer(buf);
    extracted_data = extractBookingDetailsFromText(text);
  } catch (e) {
    await sb.from("extractions").insert({
      id: extraction_id,
      processing_status: "failed",
      extracted_data: {},
      created_at: new Date().toISOString(),
      error: String(e?.message || e),
    });
    return NextResponse.json({ extraction_id });
  }

  await sb.from("extractions").insert({
    id: extraction_id,
    processing_status: "success",
    extracted_data,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ extraction_id });
}
