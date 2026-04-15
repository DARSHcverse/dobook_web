import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFilename(name) {
  const base = String(name || "upload").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  return base || "upload";
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ detail: "file is required" }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ detail: "Only JPG, PNG, or WebP images allowed" }, { status: 400 });
  }

  const size = Number(file.size || 0);
  if (size > MAX_BYTES) {
    return NextResponse.json({ detail: "File exceeds 5MB limit" }, { status: 413 });
  }

  const businessId = auth.business.id;
  const ts = Date.now();
  const path = `${businessId}/${ts}-${safeFilename(file.name)}`;

  const sb = supabaseAdmin();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await sb.storage
    .from("business-images")
    .upload(path, bytes, { contentType, upsert: false });

  if (upErr) {
    console.error("[upload-image] upload error:", upErr.message);
    return NextResponse.json({ detail: upErr.message }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from("business-images").getPublicUrl(path);
  const publicUrl = urlData?.publicUrl || "";

  return NextResponse.json({ url: publicUrl, path });
}
