import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/lib/rateLimit";
import { callAnthropicExtract } from "@/lib/packageExtractor";
import { extractTextFromPdfBuffer } from "@/lib/pdfExtract";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const limited = rateLimit({
    request,
    keyPrefix: `pkg_import_pdf:${auth.business.id}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many imports. Try again later." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ detail: "PDF file is required" }, { status: 400 });
  }

  const type = String(file.type || "").toLowerCase();
  if (type !== "application/pdf") {
    return NextResponse.json({ detail: "Only PDF files are allowed" }, { status: 400 });
  }

  const size = Number(file.size || 0);
  if (size > 10 * 1024 * 1024) {
    return NextResponse.json({ detail: "PDF exceeds 10MB limit" }, { status: 413 });
  }

  let pageContent = "";
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    pageContent = extractTextFromPdfBuffer(buf);
  } catch (err) {
    return NextResponse.json(
      { detail: "We couldn't read that PDF. Make sure it's a text-based PDF (not a scanned image). Try manual entry instead." },
      { status: 400 },
    );
  }

  if (!pageContent || pageContent.trim().length < 40) {
    return NextResponse.json(
      { detail: "We couldn't read that PDF. Make sure it's a text-based PDF (not a scanned image). Try manual entry instead." },
      { status: 400 },
    );
  }

  try {
    const extracted = await callAnthropicExtract(pageContent);
    const pkgCount = extracted.categories.reduce((n, c) => n + c.packages.length, 0);
    if (pkgCount === 0) {
      return NextResponse.json(
        { detail: "We couldn't find any packages in that PDF. Try manual entry instead." },
        { status: 400 },
      );
    }
    return NextResponse.json({ extracted, package_count: pkgCount });
  } catch (err) {
    console.error("[packages/import-pdf] extraction error:", err?.message);
    return NextResponse.json(
      { detail: err?.message?.includes("ANTHROPIC") ? "Extraction service not configured" : "Extraction failed. Try again or use manual entry." },
      { status: 500 },
    );
  }
}
