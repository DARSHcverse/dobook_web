import { NextResponse } from "next/server";
import { readDb, sanitizeBusiness } from "@/lib/localdb";

export async function GET(_request, { params }) {
  const businessId = params?.businessId;
  const db = readDb();
  const business = db.businesses.find((b) => b.id === businessId);
  if (!business) return NextResponse.json({ detail: "Business not found" }, { status: 404 });

  const safe = sanitizeBusiness(business);
  return NextResponse.json({
    business_name: safe.business_name,
    email: safe.email,
    phone: safe.phone,
  });
}

