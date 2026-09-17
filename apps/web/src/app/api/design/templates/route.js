import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { hasProAccess } from "@/lib/entitlements";
import { normalizeDesignSpec } from "@/lib/design/specs";
import { normalizeMonogramSpec } from "@/lib/design/monogram";

export const runtime = "nodejs";

// Keeps one business from filling the table; well above any realistic library.
const MAX_SAVED = 100;

const KINDS = new Set(["strip", "monogram"]);

function normalizeByKind(kind, spec) {
  return kind === "monogram" ? normalizeMonogramSpec(spec) : normalizeDesignSpec(spec);
}

function proGate(auth) {
  if (hasProAccess(auth.business)) return null;
  return NextResponse.json(
    { detail: "Design Studio is available on the Pro plan." },
    { status: 403 },
  );
}

// The design tables are created by 20260917120000_design_studio.sql. Until that
// migration runs Postgres reports an undefined table/column; surface that as a
// clear 503 rather than a generic 500 so the cause is obvious.
function isMissingSchema(error) {
  const code = String(error?.code || "");
  const msg = String(error?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

function schemaMissingResponse() {
  return NextResponse.json(
    { detail: "Saved designs need a database migration that has not been applied yet." },
    { status: 503 },
  );
}

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  const gated = proGate(auth);
  if (gated) return gated;

  const { data, error } = await auth.supabase
    .from("design_templates")
    .select("id,name,kind,spec,booking_id,created_at")
    .eq("business_id", auth.business.id)
    .order("created_at", { ascending: false })
    .limit(MAX_SAVED);

  if (error) {
    if (isMissingSchema(error)) return schemaMissingResponse();
    console.error("[design/templates] list error:", error.message);
    return NextResponse.json({ detail: "Failed to load saved designs" }, { status: 500 });
  }

  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  const gated = proGate(auth);
  if (gated) return gated;

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name || "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ detail: "Name is required" }, { status: 400 });

  const kind = KINDS.has(body?.kind) ? body.kind : "strip";
  if (!body?.spec || typeof body.spec !== "object") {
    return NextResponse.json({ detail: "spec is required" }, { status: 400 });
  }

  // Normalize before storing so a saved design can always be rendered, even if
  // the client sent something malformed.
  const spec = normalizeByKind(kind, body.spec);

  const { count, error: countErr } = await auth.supabase
    .from("design_templates")
    .select("id", { count: "exact", head: true })
    .eq("business_id", auth.business.id);

  if (countErr && isMissingSchema(countErr)) return schemaMissingResponse();
  if (!countErr && Number(count) >= MAX_SAVED) {
    return NextResponse.json(
      { detail: `You can save up to ${MAX_SAVED} designs. Delete one to make room.` },
      { status: 400 },
    );
  }

  const bookingId =
    typeof body?.booking_id === "string" && /^[0-9a-f-]{36}$/i.test(body.booking_id)
      ? body.booking_id
      : null;

  const { data, error } = await auth.supabase
    .from("design_templates")
    .insert({
      business_id: auth.business.id,
      name,
      kind,
      spec,
      booking_id: bookingId,
    })
    .select("id,name,kind,spec,booking_id,created_at")
    .maybeSingle();

  if (error) {
    if (isMissingSchema(error)) return schemaMissingResponse();
    console.error("[design/templates] create error:", error.message);
    return NextResponse.json({ detail: "Failed to save design" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  const gated = proGate(auth);
  if (gated) return gated;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ detail: "id is required" }, { status: 400 });

  // Scoped to business_id so one business can never delete another's design.
  const { error } = await auth.supabase
    .from("design_templates")
    .delete()
    .eq("id", id)
    .eq("business_id", auth.business.id);

  if (error) {
    if (isMissingSchema(error)) return schemaMissingResponse();
    console.error("[design/templates] delete error:", error.message);
    return NextResponse.json({ detail: "Failed to delete design" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
