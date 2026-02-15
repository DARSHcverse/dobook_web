import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";

export async function DELETE(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (auth.mode === "supabase") {
    const { error } = await auth.supabase
      .from("businesses")
      .delete()
      .eq("id", auth.business.id)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const businessId = auth.business.id;
  auth.db.businesses = auth.db.businesses.filter((b) => b.id !== businessId);
  auth.db.sessions = auth.db.sessions.filter((s) => s.businessId !== businessId);
  auth.db.bookings = auth.db.bookings.filter((b) => b.business_id !== businessId);
  auth.db.invoiceTemplates = auth.db.invoiceTemplates.filter((t) => t.business_id !== businessId);
  auth.db.invoices = auth.db.invoices.filter((i) => i.business_id !== businessId);

  auth.saveDb(auth.db);
  return NextResponse.json({ ok: true });
}

