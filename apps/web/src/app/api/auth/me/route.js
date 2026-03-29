import { NextResponse } from "next/server";
import { requireSession, sanitizeBusiness } from "@/app/api/_utils/auth";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth?.error) return auth.error;
  return NextResponse.json({ business: sanitizeBusiness(auth.business) });
}
