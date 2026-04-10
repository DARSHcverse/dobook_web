import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { hasProAccess } from "@/lib/entitlements";
import { setSyncEnabled } from "@/lib/googleCalendar";

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  if (!hasProAccess(auth.business)) {
    return NextResponse.json({ detail: "Pro plan required" }, { status: 403 });
  }

  const body = await request.json();
  const enabled = Boolean(body?.enabled);

  try {
    await setSyncEnabled(auth.business.id, enabled);
    return NextResponse.json({ ok: true, sync_enabled: enabled });
  } catch (e) {
    console.error("[google/toggle] failed:", e?.message);
    return NextResponse.json({ detail: "Failed to update sync setting" }, { status: 500 });
  }
}
