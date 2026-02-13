import { NextResponse } from "next/server";
import { readDb } from "@/lib/localdb";

export async function GET(_request, { params }) {
  const extractionId = params?.extractionId;
  const db = readDb();
  const extraction = db.extractions.find((e) => e.id === extractionId);
  if (!extraction) return NextResponse.json({ detail: "Extraction not found" }, { status: 404 });
  return NextResponse.json(extraction);
}

