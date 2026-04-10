import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { hasProAccess } from "@/lib/entitlements";
import { buildAuthUrl } from "@/lib/googleCalendar";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (!hasProAccess(auth.business)) {
    return NextResponse.json(
      { detail: "Google Calendar sync is a Pro feature. Upgrade to Pro to connect Google Calendar." },
      { status: 403 },
    );
  }

  const url = buildAuthUrl(String(auth.business.id));
  return NextResponse.redirect(url);
}
