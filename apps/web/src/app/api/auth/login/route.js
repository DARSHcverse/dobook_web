import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readDb, writeDb, sanitizeBusiness } from "@/lib/localdb";

export async function POST(request) {
  const body = await request.json();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  const db = readDb();
  const business = db.businesses.find((b) => b.email.toLowerCase() === email);
  if (!business) return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });

  const ok = await bcrypt.compare(password, business.password_hash || "");
  if (!ok) return NextResponse.json({ detail: "Invalid email or password" }, { status: 401 });

  const token = randomUUID();
  db.sessions.push({
    token,
    businessId: business.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  writeDb(db);

  return NextResponse.json({ token, business: sanitizeBusiness(business) });
}
