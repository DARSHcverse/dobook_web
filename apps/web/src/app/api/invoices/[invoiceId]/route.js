import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";

export async function GET(request, { params }) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const invoiceId = params?.invoiceId;
  const invoice = auth.db.invoices.find((i) => i.id === invoiceId && i.business_id === auth.business.id);
  if (!invoice) return NextResponse.json({ detail: "Invoice not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

