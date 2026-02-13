import { NextResponse } from "next/server";
import { requireSession } from "../../_utils/auth";

export async function PUT(request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const allowed = [
    "business_name",
    "phone",
    "business_address",
    "abn",
    "logo_url",
    "bank_name",
    "account_name",
    "bsb",
    "account_number",
    "payment_link",
  ];

  for (const key of allowed) {
    if (key in body) auth.business[key] = body[key] ?? "";
  }

  auth.saveDb(auth.db);
  return NextResponse.json(auth.sanitizeBusiness(auth.business));
}
