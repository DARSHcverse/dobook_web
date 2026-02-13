import { NextResponse } from "next/server";
import { readDb, writeDb, sanitizeBusiness } from "@/lib/localdb";

export function unauthorized(detail = "Not authenticated") {
  return NextResponse.json({ detail }, { status: 401 });
}

export function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export function requireSession(request) {
  const token = getBearerToken(request);
  if (!token) return { error: unauthorized() };

  const db = readDb();
  const session = db.sessions.find((s) => s.token === token && (!s.expiresAt || Date.now() < s.expiresAt));
  if (!session) return { error: unauthorized() };

  const business = db.businesses.find((b) => b.id === session.businessId);
  if (!business) return { error: unauthorized() };

  return {
    db,
    session,
    business,
    saveDb: (nextDb) => writeDb(nextDb),
    sanitizeBusiness,
  };
}

