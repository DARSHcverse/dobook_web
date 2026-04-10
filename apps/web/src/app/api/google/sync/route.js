import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { hasProAccess } from "@/lib/entitlements";
import { syncAllBookings } from "@/lib/googleCalendar";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (!hasProAccess(auth.business)) {
    return NextResponse.json({ detail: "Pro plan required" }, { status: 403 });
  }

  try {
    const count = await syncAllBookings(auth.business.id);
    return NextResponse.json({ ok: true, synced: count });
  } catch (e) {
    console.error("[google/sync] failed:", e?.message);
    return NextResponse.json({ detail: "Sync failed" }, { status: 500 });
  }
}
