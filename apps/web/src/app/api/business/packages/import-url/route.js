import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_utils/auth";
import { rateLimit } from "@/lib/rateLimit";
import { callAnthropicExtract, stripHtmlToText } from "@/lib/packageExtractor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;

  const limited = rateLimit({
    request,
    keyPrefix: `pkg_import_url:${auth.business.id}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many imports. Try again later." }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const url = String(body?.url || "").trim();
  const pastedContent = String(body?.content || "").trim();

  let pageContent = "";

  if (pastedContent) {
    pageContent = stripHtmlToText(pastedContent);
  } else if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ detail: "Invalid URL" }, { status: 400 });
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      return NextResponse.json({ detail: "Only http/https URLs allowed" }, { status: 400 });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DoBookImporter/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);
      if (!res.ok) {
        return NextResponse.json(
          { detail: `We couldn't read that page (HTTP ${res.status}). It may be blocked or unavailable.` },
          { status: 400 },
        );
      }
      const html = await res.text();
      pageContent = stripHtmlToText(html);
    } catch (err) {
      return NextResponse.json(
        { detail: "We couldn't read that page. It may be blocked or unavailable. Try pasting the page content directly or upload a PDF instead." },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ detail: "Provide a URL or paste page content" }, { status: 400 });
  }

  if (pageContent.length < 40) {
    return NextResponse.json(
      { detail: "We couldn't find any packages on that page. Try a different URL or use manual entry." },
      { status: 400 },
    );
  }

  try {
    const extracted = await callAnthropicExtract(pageContent);
    const pkgCount = extracted.categories.reduce((n, c) => n + c.packages.length, 0);
    if (pkgCount === 0) {
      return NextResponse.json(
        { detail: "We couldn't find any packages on that page. Try a different URL or use manual entry." },
        { status: 200, statusText: "Empty" },
      );
    }
    return NextResponse.json({ extracted, package_count: pkgCount });
  } catch (err) {
    console.error("[packages/import-url] extraction error:", err?.message);
    return NextResponse.json(
      { detail: err?.message?.includes("ANTHROPIC") ? "Extraction service not configured" : "Extraction failed. Try again or use manual entry." },
      { status: 500 },
    );
  }
}
