"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ArrowRight, Wand2 } from "lucide-react";
import { formatMoney } from "@/lib/money";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";

// Pre-signup magic: paste a website/social link → AI builds a live preview of
// your booking page. Converts anonymous visitors by showing value first.
export default function InstantSetupHero() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  async function handleGenerate(e) {
    e?.preventDefault?.();
    const value = url.trim();
    if (value.length < 4) {
      setError("Enter your website or Instagram link.");
      return;
    }
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/instant-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "We couldn't build a preview. Try again.");
      setPreview(data.preview || null);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClaim() {
    // Carry the source link into signup so setup can be auto-applied.
    const params = new URLSearchParams({ mode: "signup", plan: "free" });
    if (url.trim()) params.set("from", url.trim());
    router.push(`/auth?${params.toString()}`);
  }

  const brand = preview?.brand_color || "#E8193C";

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white">
          <Wand2 className="h-4 w-4" />
        </span>
        <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: "Manrope" }}>
          See your booking page in 30 seconds
        </div>
      </div>

      <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourwebsite.com or instagram.com/yourbiz"
          className="flex-1 h-12 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          disabled={loading}
          aria-label="Your website or social link"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-70 transition-colors"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Building…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Build it</>
          )}
        </button>
      </form>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      {!preview && !error ? (
        <p className="mt-2 text-xs text-zinc-500">
          No signup needed. We&apos;ll build a live preview from your existing site.
        </p>
      ) : null}

      {preview ? (
        <div className="mt-4 rounded-xl border border-zinc-200 overflow-hidden animate-in fade-in duration-500">
          <div className="p-4" style={{ background: `linear-gradient(135deg, ${brand}14, transparent)` }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-bold text-zinc-900 truncate" style={{ fontFamily: "Manrope" }}>
                  {preview.business_name || "Your business"}
                </div>
                {preview.tagline ? <div className="text-xs text-zinc-600 truncate">{preview.tagline}</div> : null}
              </div>
              <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${brand}1a`, color: brand }}>
                {preview.business_type_label}
              </span>
            </div>
            {preview.bio ? <p className="mt-2 text-xs text-zinc-600 line-clamp-2">{preview.bio}</p> : null}
          </div>

          {preview.services?.length ? (
            <div className="p-4 border-t border-zinc-100">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">
                Services we set up for you
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {preview.services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-800 truncate pr-2">{s.name}</span>
                    <span className="text-zinc-500 shrink-0">
                      {s.price > 0 ? formatMoney(s.price, "aud", { maximumFractionDigits: 0 }) : "—"}
                      {s.duration_minutes ? ` · ${s.duration_minutes}m` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="p-4 border-t border-zinc-100 bg-zinc-50/60">
            <button
              onClick={handleClaim}
              className="w-full h-11 rounded-xl text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{ background: brand }}
            >
              This is your booking page — claim it free <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-2 text-center text-[11px] text-zinc-500">
              Free to start · No credit card · Edit everything after
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
