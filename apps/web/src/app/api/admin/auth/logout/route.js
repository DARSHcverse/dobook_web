import { NextResponse } from "next/server";
import { clearAdminAccessCookie } from "@/lib/adminAccess";
import { clearAdminCookie } from "@/lib/adminAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAdminCookie(response);
  clearAdminAccessCookie(response);
  return response;
}
