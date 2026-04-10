import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { exchangeCodeAndSave } from "@/lib/googleCalendar";

export async function GET(request) {
  const auth = await requireSession(request);
  if (auth.error) {
    // Session may have expired; redirect to auth page.
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const reason = error || "no_code";
    return NextResponse.redirect(
      new URL(`/dashboard?google_error=${encodeURIComponent(reason)}`, request.url),
    );
  }

  try {
    await exchangeCodeAndSave(auth.business.id, code);
  } catch (e) {
    console.error("[google/callback] exchangeCodeAndSave failed:", e?.message);
    return NextResponse.redirect(
      new URL(`/dashboard?google_error=${encodeURIComponent("token_exchange_failed")}`, request.url),
    );
  }

  return NextResponse.redirect(new URL("/dashboard?google_connected=true", request.url));
}
