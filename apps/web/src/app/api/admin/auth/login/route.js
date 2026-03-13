import { NextResponse } from "next/server";
import { buildAdminCookie } from "@/lib/adminAuth";
import { isOwnerEmail } from "@/lib/entitlements";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const secret = String(body?.secret || body?.password || "").trim();

  if (!email || !secret) {
    return NextResponse.json({ detail: "Email and secret are required" }, { status: 400 });
  }

  const adminSecret = String(process.env.ADMIN_SECRET || "").trim();
  if (!adminSecret) {
    return NextResponse.json({ detail: "ADMIN_SECRET is not configured" }, { status: 500 });
  }

  if (secret !== adminSecret) {
    return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }

  if (!isOwnerEmail(email)) {
    return NextResponse.json({ detail: "Not authorized" }, { status: 403 });
  }

  const cookie = buildAdminCookie({ email });
  if (!cookie) {
    return NextResponse.json({ detail: "Failed to create session" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie);
  return response;
}
