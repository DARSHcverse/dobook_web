import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../../_utils/auth";
import { hasProAccess } from "@/lib/entitlements";

const FREE_PLAN_MAX_TEMPLATES = 1;

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
  const append = body?.append === true;

  // "append" keeps multiple templates (Pro feature). Default behavior keeps exactly 1
  // active template per business by updating the latest row and deleting the rest.
  if (append && !hasProAccess(auth.business)) {
    if (auth.mode === "supabase") {
      const { count, error } = await auth.supabase
        .from("invoice_templates")
        .select("id", { count: "exact", head: true })
        .eq("business_id", auth.business.id);
      if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
      if ((count || 0) >= FREE_PLAN_MAX_TEMPLATES) {
        return NextResponse.json(
          { detail: "Free plan allows 1 invoice template. Upgrade to Pro to add more." },
          { status: 403 },
        );
      }
    } else {
      const count = auth.db.invoiceTemplates.filter((t) => t.business_id === auth.business.id).length;
      if (count >= FREE_PLAN_MAX_TEMPLATES) {
        return NextResponse.json(
          { detail: "Free plan allows 1 invoice template. Upgrade to Pro to add more." },
          { status: 403 },
        );
      }
    }
  }

  const templateInput = {
    id: randomUUID(),
    business_id: auth.business.id,
    template_name: String(body?.template_name || "Classic"),
    logo_url: body?.logo_url ? String(body.logo_url) : null,
    primary_color: String(body?.primary_color || "#e11d48"),
    created_at: new Date().toISOString(),
  };

  if (!append) {
    if (auth.mode === "supabase") {
      const { data: existing, error: existingErr } = await auth.supabase
        .from("invoice_templates")
        .select("id")
        .eq("business_id", auth.business.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (existingErr) return NextResponse.json({ detail: existingErr.message }, { status: 500 });

      const keepId = existing?.[0]?.id || null;
      if (keepId) {
        const { data, error } = await auth.supabase
          .from("invoice_templates")
          .update({
            template_name: templateInput.template_name,
            logo_url: templateInput.logo_url,
            primary_color: templateInput.primary_color,
            created_at: templateInput.created_at,
          })
          .eq("id", keepId)
          .eq("business_id", auth.business.id)
          .select("*")
          .maybeSingle();
        if (error || !data) return NextResponse.json({ detail: error?.message || "Failed to update template" }, { status: 500 });

        // Enforce single active template.
        await auth.supabase
          .from("invoice_templates")
          .delete()
          .eq("business_id", auth.business.id)
          .neq("id", keepId);

        return NextResponse.json(data);
      }

      const { data, error } = await auth.supabase
        .from("invoice_templates")
        .insert(templateInput)
        .select("*")
        .maybeSingle();
      if (error || !data) return NextResponse.json({ detail: error?.message || "Failed to create template" }, { status: 500 });
      return NextResponse.json(data);
    }

    const list = auth.db.invoiceTemplates.filter((t) => t.business_id === auth.business.id);
    list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const keep = list[0] || null;

    if (keep) {
      keep.template_name = templateInput.template_name;
      keep.logo_url = templateInput.logo_url;
      keep.primary_color = templateInput.primary_color;
      keep.created_at = templateInput.created_at;
      auth.db.invoiceTemplates = auth.db.invoiceTemplates.filter(
        (t) => t.business_id !== auth.business.id || t.id === keep.id,
      );
      auth.saveDb(auth.db);
      return NextResponse.json(keep);
    }

    auth.db.invoiceTemplates.push(templateInput);
    auth.saveDb(auth.db);
    return NextResponse.json(templateInput);
  }

  if (auth.mode === "supabase") {
    const { data, error } = await auth.supabase
      .from("invoice_templates")
      .insert(templateInput)
      .select("*")
      .maybeSingle();
    if (error || !data) return NextResponse.json({ detail: error?.message || "Failed to create template" }, { status: 500 });
    return NextResponse.json(data);
  }

  auth.db.invoiceTemplates.push(templateInput);
  auth.saveDb(auth.db);
  return NextResponse.json(templateInput);
}
