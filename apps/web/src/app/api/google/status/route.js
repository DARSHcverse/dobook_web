import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { getGoogleCalendarStatus } from "@/lib/googleCalendar";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const status = await getGoogleCalendarStatus(auth.business.id);
  return NextResponse.json(status || null);
}
