import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readDb, writeDb } from "@/lib/localdb";

export async function POST(request) {
  // Backendless stub: accept the upload and immediately mark extraction as success.
  // The UI polls /upload/extraction/:id and then can confirm a booking.
  const extraction_id = randomUUID();

  const db = readDb();
  db.extractions.push({
    id: extraction_id,
    processing_status: "success",
    extracted_data: {},
    created_at: new Date().toISOString(),
  });
  writeDb(db);

  // Consume body to avoid unused request warnings in some runtimes.
  try {
    await request.formData();
  } catch {
    // ignore
  }

  return NextResponse.json({ extraction_id });
}
