import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extractBookingDetailsFromText, extractTextFromPdfBuffer } from "@/lib/pdfExtract";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

function reject(request, status, detail, reason) {
  const ip = getClientIp(request);
  const message = reason || detail;
  console.error(`[reject] POST /api/upload/pdf ip=${ip} reason=${message}`);
  return NextResponse.json({ detail }, { status });
}

export async function POST(request) {
  const limited = rateLimit({
    request,
    keyPrefix: "pdf_upload",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    console.error(`[reject] POST /api/upload/pdf ip=${limited.ip} reason=rate_limited`);
    const res = NextResponse.json({ detail: "Too many requests" }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const extraction_id = randomUUID();
  const sb = supabaseAdmin();

  let extracted_data = {};
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return reject(request, 400, "file is required", "missing_file");
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);
    const type = String(file.type || "").toLowerCase();
    if (!allowedTypes.has(type)) {
      return reject(request, 400, "Unsupported file type", "invalid_file_type");
    }
    const size = Number(file.size || 0);
    if (size > 10 * 1024 * 1024) {
      return reject(request, 400, "Max 10MB per file", "file_too_large");
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
