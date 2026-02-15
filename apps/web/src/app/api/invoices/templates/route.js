import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../../_utils/auth";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (auth.mode === "supabase") {
    const { data, error } = await auth.supabase
      .from("invoice_templates")
      .select("*")
      .eq("business_id", auth.business.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  const templates = auth.db.invoiceTemplates.filter((t) => t.business_id === auth.business.id);
  return NextResponse.json(templates);
}

export async function POST(request) {
  const auth = await requireSession(request);
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

  if (auth.mode === "supabase") {
    const { data, error } = await auth.supabase
      .from("invoice_templates")
      .insert(template)
      .select("*")
      .maybeSingle();
    if (error || !data) return NextResponse.json({ detail: error?.message || "Failed to create template" }, { status: 500 });
    return NextResponse.json(data);
  }

  auth.db.invoiceTemplates.push(template);
  auth.saveDb(auth.db);
  return NextResponse.json(template);
}
