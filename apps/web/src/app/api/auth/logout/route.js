import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBearerToken, getSessionToken, SESSION_COOKIE } from "@/app/api/_utils/auth";

export async function POST(request) {
  const token = getSessionToken(request) || getBearerToken(request);
  const sb = supabaseAdmin();

  if (token) {
    const { error } = await sb.from("sessions").delete().eq("token", token);
    if (error) {
      const response = NextResponse.json({ detail: error.message }, { status: 500 });
      response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expires: new Date(0),
        path: "/",
      });
      return response;
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
