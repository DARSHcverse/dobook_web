import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";

export async function POST(request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const form = await request.formData();
  const file = form.get("file");
  if (!file) return NextResponse.json({ detail: "file is required" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const contentType = file.type || "application/octet-stream";
  const logo_url = `data:${contentType};base64,${base64}`;

  auth.business.logo_url = logo_url;
  auth.saveDb(auth.db);

  return NextResponse.json({ logo_url });
}

