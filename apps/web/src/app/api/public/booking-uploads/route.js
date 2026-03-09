import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function safePathPart(value) {
  return String(value || "")
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "_")
    .replaceAll(/_+/g, "_")
    .slice(0, 120);
}

export async function POST(request) {
  const form = await request.formData();
  const businessId = String(form.get("business_id") || "").trim();
  if (!businessId) return NextResponse.json({ detail: "business_id is required" }, { status: 400 });

  const files = form.getAll("files").filter(Boolean);
  if (!files.length) return NextResponse.json({ detail: "No files uploaded" }, { status: 400 });
  if (files.length > 5) return NextResponse.json({ detail: "Max 5 files" }, { status: 400 });

  const sb = supabaseAdmin();

  const uploaded = [];
  for (const file of files) {
    if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") continue;
    const name = safePathPart(file.name || "upload");
    const size = Number(file.size || 0);
    if (size > 10 * 1024 * 1024) {
      return NextResponse.json({ detail: "Max 10MB per file" }, { status: 400 });
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

