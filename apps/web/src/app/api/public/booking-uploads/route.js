import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

function reject(request, status, detail, reason) {
  const ip = getClientIp(request);
  const message = reason || detail;
  console.error(`[reject] POST /api/public/booking-uploads ip=${ip} reason=${message}`);
  return NextResponse.json({ detail }, { status });
}

function safePathPart(value) {
  return String(value || "")
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "_")
    .replaceAll(/_+/g, "_")
    .slice(0, 120);
}

export async function POST(request) {
  const limited = rateLimit({
    request,
    keyPrefix: "booking_uploads",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    console.error(`[reject] POST /api/public/booking-uploads ip=${limited.ip} reason=rate_limited`);
    const res = NextResponse.json({ detail: "Too many requests" }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const form = await request.formData();
  const businessId = String(form.get("business_id") || "").trim();
  if (!businessId) return reject(request, 400, "business_id is required", "missing_business_id");

  const files = form.getAll("files").filter(Boolean);
  if (!files.length) return reject(request, 400, "No files uploaded", "missing_files");
  if (files.length > 5) return reject(request, 400, "Max 5 files", "too_many_files");

  const sb = supabaseAdmin();

  const uploaded = [];
  for (const file of files) {
    if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") continue;
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
    const name = safePathPart(file.name || "upload");
    const size = Number(file.size || 0);
    if (size > 10 * 1024 * 1024) {
      return reject(request, 400, "Max 10MB per file", "file_too_large");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const path = `${safePathPart(businessId)}/${Date.now()}_${randomUUID()}_${name}`;

    const { error } = await sb.storage.from("booking_uploads").upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) return NextResponse.json({ detail: error.message }, { status: 400 });

    const { data } = sb.storage.from("booking_uploads").getPublicUrl(path);
    uploaded.push({ path, url: data?.publicUrl || null, name: file.name || name, size });
  }

  return NextResponse.json({ ok: true, files: uploaded });
}
