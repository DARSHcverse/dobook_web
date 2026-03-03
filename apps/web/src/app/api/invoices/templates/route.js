import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSession } from "../../_utils/auth";
import { hasProAccess } from "@/lib/entitlements";

const FREE_PLAN_MAX_TEMPLATES = 1;

function asBool(value, fallback = false) {
  if (value === true || value === false) return value;
  if (value === null || value === undefined) return fallback;
  const s = String(value || "").trim().toLowerCase();
  if (!s) return fallback;
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function normalizeHexColor(value, fallback = null) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const s = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-f]{6}$/i.test(s)) return fallback;
  return s.toLowerCase();
}

function normalizeEnum(value, allowed, fallback) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return fallback;
  return allowed.includes(s) ? s : fallback;
}

function normalizeFontFamily(value) {
  const s = String(value || "").trim().toLowerCase();
  const allowed = ["helvetica", "times", "courier"];
  return allowed.includes(s) ? s : "helvetica";
}

function normalizeFooterText(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return s.slice(0, 500);
}

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
    primary_color: normalizeHexColor(body?.primary_color, "#e11d48"),
    secondary_color: normalizeHexColor(body?.secondary_color, null),
    font_family: normalizeFontFamily(body?.font_family),
    logo_position: normalizeEnum(body?.logo_position, ["left", "center", "right"], "left"),
    show_abn: asBool(body?.show_abn, true),
    show_due_date: asBool(body?.show_due_date, true),
    show_notes: asBool(body?.show_notes, true),
    table_style: normalizeEnum(body?.table_style, ["minimal", "bordered", "striped"], "minimal"),
    footer_text: normalizeFooterText(body?.footer_text),
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
            secondary_color: templateInput.secondary_color,
            font_family: templateInput.font_family,
            logo_position: templateInput.logo_position,
            show_abn: templateInput.show_abn,
            show_due_date: templateInput.show_due_date,
            show_notes: templateInput.show_notes,
            table_style: templateInput.table_style,
            footer_text: templateInput.footer_text,
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
      keep.secondary_color = templateInput.secondary_color;
      keep.font_family = templateInput.font_family;
      keep.logo_position = templateInput.logo_position;
      keep.show_abn = templateInput.show_abn;
      keep.show_due_date = templateInput.show_due_date;
      keep.show_notes = templateInput.show_notes;
      keep.table_style = templateInput.table_style;
      keep.footer_text = templateInput.footer_text;
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
