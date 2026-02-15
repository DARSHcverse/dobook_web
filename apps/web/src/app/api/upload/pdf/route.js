import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "@/lib/localdb";
import { extractBookingDetailsFromText, extractTextFromPdfBuffer } from "@/lib/pdfExtract";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request) {
  const extraction_id = randomUUID();

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
    if (hasSupabaseConfig()) {
      const sb = supabaseAdmin();
      await sb.from("extractions").insert({
        id: extraction_id,
        processing_status: "failed",
        extracted_data: {},
        created_at: new Date().toISOString(),
        error: String(e?.message || e),
      });
      return NextResponse.json({ extraction_id });
    }

    const db = readDb();
    db.extractions.push({
      id: extraction_id,
      processing_status: "failed",
      extracted_data: {},
      created_at: new Date().toISOString(),
      error: String(e?.message || e),
    });
    writeDb(db);
    return NextResponse.json({ extraction_id });
  }

  if (hasSupabaseConfig()) {
    const sb = supabaseAdmin();
    await sb.from("extractions").insert({
      id: extraction_id,
      processing_status: "success",
      extracted_data,
      created_at: new Date().toISOString(),
    });
    return NextResponse.json({ extraction_id });
  }

  const db = readDb();
  db.extractions.push({
    id: extraction_id,
    processing_status: "success",
    extracted_data,
    created_at: new Date().toISOString(),
  });
  writeDb(db);

  return NextResponse.json({ extraction_id });
}
