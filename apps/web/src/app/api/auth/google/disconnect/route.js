import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { disconnectGoogleCalendar } from "@/lib/googleCalendar";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  try {
    await disconnectGoogleCalendar(auth.business.id);
  } catch (e) {
    console.error("[google/disconnect] failed:", e?.message);
    return NextResponse.json({ detail: "Failed to disconnect Google Calendar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
