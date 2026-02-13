import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../../_utils/auth";

export async function GET(request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const templates = auth.db.invoiceTemplates.filter((t) => t.business_id === auth.business.id);
  return NextResponse.json(templates);
}

export async function POST(request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const template = {
    id: randomUUID(),
    business_id: auth.business.id,
    template_name: String(body?.template_name || "Classic"),
    logo_url: body?.logo_url ? String(body.logo_url) : null,
    primary_color: String(body?.primary_color || "#e11d48"),
    created_at: new Date().toISOString(),
  };

  auth.db.invoiceTemplates.push(template);
  auth.saveDb(auth.db);
  return NextResponse.json(template);
}
