import { NextResponse } from "next/server";
import { requireSession } from "../../../_utils/auth";

export async function DELETE(request, { params }) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const templateId = params?.templateId;
  if (auth.mode === "supabase") {
    const { data, error } = await auth.supabase
      .from("invoice_templates")
      .delete()
      .eq("id", templateId)
      .eq("business_id", auth.business.id)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ detail: "Template not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const before = auth.db.invoiceTemplates.length;
  auth.db.invoiceTemplates = auth.db.invoiceTemplates.filter(
    (t) => !(t.id === templateId && t.business_id === auth.business.id),
  );
  const after = auth.db.invoiceTemplates.length;

  auth.saveDb(auth.db);
  if (after === before) return NextResponse.json({ detail: "Template not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
