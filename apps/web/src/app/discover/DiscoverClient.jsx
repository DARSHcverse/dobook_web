"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeServices(b) {
  const fromPublic = asList(b?.public_services)
    .map((s) => String(s?.name || "").trim())
    .filter(Boolean);
  if (fromPublic.length) return fromPublic.slice(0, 3);
  return asList(b?.booth_types).map((x) => String(x || "").trim()).filter(Boolean).slice(0, 3);
}

function normalizeWebsiteUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  let candidate = value;
  if (/^\/\//.test(candidate)) candidate = `https:${candidate}`;
  else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) candidate = `https://${candidate}`;

  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

export default function DiscoverClient({ initialQ = "", initialPostcode = "" }) {
  const router = useRouter();
  const [q, setQ] = useState(String(initialQ || ""));
  const [postcode, setPostcode] = useState(String(initialPostcode || ""));
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIntent, setAiIntent] = useState(null); // set when AI results are shown

  const onAiSearch = async () => {
    const query = String(aiQuery || "").trim();
    if (query.length < 3) {
      setError("Describe what you're looking for.");
      return;
    }
    setAiLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/discover/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || "Search failed");
      setAiIntent(json.intent || { summary: "" });
      setResults(Array.isArray(json.results) ? json.results : []);
    } catch (e) {
      setError(e?.message || "Search failed");
    } finally {
      setAiLoading(false);
    }
  };

  const clearAi = () => {
    setAiIntent(null);
    setAiQuery("");
    fetchResults(q, postcode);
  };

  const queryKey = useMemo(() => `${String(initialQ || "")}__${String(initialPostcode || "")}`, [initialPostcode, initialQ]);

  const fetchResults = async (nextQ, nextPostcode) => {
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/public/businesses", window.location.origin);
      if (String(nextQ || "").trim()) url.searchParams.set("q", String(nextQ || "").trim());
      if (String(nextPostcode || "").trim()) url.searchParams.set("postcode", String(nextPostcode || "").trim());

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) throw new Error("Failed to load businesses");
      const json = await res.json();
      setResults(Array.isArray(json) ? json : []);
    } catch (e) {
      setResults([]);
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(initialQ, initialPostcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const onSearch = async () => {
    const nextQ = String(q || "").trim();
    const nextPostcode = String(postcode || "").trim();
    const url = new URL("/discover", window.location.origin);
    if (nextQ) url.searchParams.set("q", nextQ);
    if (nextPostcode) url.searchParams.set("postcode", nextPostcode);
    router.push(url.pathname + url.search);
    await fetchResults(nextQ, nextPostcode);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200"
            onClick={() => router.push("/")}
            aria-label="Go to DoBook home"
          >
            <img src="/brand/dobook-logo.png" alt="DoBook" className="h-10 w-auto" draggable={false} />
            <div className="font-semibold">Find nearby services</div>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 rounded-full" onClick={() => router.push("/auth")}>
              Business login
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">
        {/* AI-powered natural-language search */}
        <Card className="border-rose-200 bg-gradient-to-b from-rose-50/70 to-white shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle style={{ fontFamily: "Manrope" }} className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white text-sm">✦</span>
              Describe what you need
            </CardTitle>
            <CardDescription style={{ fontFamily: "Inter" }}>
              Tell us in your own words — we&apos;ll match you to the right businesses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onAiSearch(); }}
                placeholder="e.g. photographer for a 100-guest wedding in July under $2000"
                className="bg-white h-12 flex-1"
              />
              <Button onClick={onAiSearch} disabled={aiLoading} className="h-12 px-6 bg-rose-600 hover:bg-rose-700 rounded-xl">
                {aiLoading ? "Matching…" : "Find matches"}
              </Button>
            </div>
            {aiIntent ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {aiIntent.summary ? <span className="text-zinc-700">Showing matches for: <strong>{aiIntent.summary}</strong></span> : null}
                <button onClick={clearAi} className="text-rose-600 hover:text-rose-700 underline underline-offset-2 text-xs">
                  Clear
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle style={{ fontFamily: "Manrope" }}>Or search directly</CardTitle>
            <CardDescription style={{ fontFamily: "Inter" }}>
              Search by business name or service, and optionally filter by postcode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. photo booth, salon, tutor…"
                  className="bg-zinc-50 h-11"
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="Postcode"
                  className="bg-zinc-50 h-11"
                  inputMode="numeric"
                />
              </div>
              <div className="md:col-span-2">
                <Button onClick={onSearch} className="w-full h-11 bg-rose-600 hover:bg-rose-700 rounded-xl">
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
            {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-600">{loading ? "Loading..." : `${results.length} result(s)`}</div>
          <Button variant="outline" className="h-10 rounded-full" onClick={() => router.push("/")}>
            Back to home
          </Button>
        </div>

        {results.length === 0 && !loading ? (
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardContent className="py-10 text-center text-zinc-600">
              No businesses found. Try a different search.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((b) => {
              const websiteUrl = normalizeWebsiteUrl(b.public_website);
              return (
                <Card key={b.id} className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={b.logo_url || "/brand/dobook-logo.png"}
                      alt={b.business_name || "Business"}
                      className="h-12 w-12 rounded-xl object-cover border border-zinc-200 bg-zinc-50"
                      draggable={false}
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/discover/${b.id}`)}
                        className="text-left font-semibold truncate hover:underline"
                        style={{ fontFamily: "Manrope" }}
                      >
                        {b.business_name}
                      </button>
                      <div className="text-xs text-zinc-500 truncate">{b.industry}</div>
                    </div>
                  </div>
                  {b.public_description ? (
                    <div className="text-sm text-zinc-700 leading-6 line-clamp-4">{b.public_description}</div>
                  ) : (
                    <div className="text-sm text-zinc-500">No description provided.</div>
                  )}
                  {Array.isArray(b.match_reasons) && b.match_reasons.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {b.match_reasons.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-0.5">
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-zinc-500">
                    {(b.public_postcode || b.business_address) ? (
                      <div className="truncate">
                        {b.public_postcode ? `Postcode: ${b.public_postcode}` : null}
                        {b.public_postcode && b.business_address ? " • " : null}
                        {b.business_address ? b.business_address : null}
                      </div>
                    ) : null}
                    {summarizeServices(b).length ? (
                      <div className="truncate mt-1">{summarizeServices(b).join(" • ")}</div>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 rounded-xl"
                      onClick={() => router.push(b.booking_url || `/book/${b.id}`)}
                    >
                      Book now
                    </Button>
                    <Button variant="outline" className="h-11 rounded-xl" onClick={() => router.push(`/discover/${b.id}`)}>
                      Details
                    </Button>
                    {websiteUrl ? (
                      <Button asChild variant="outline" className="h-11 rounded-xl">
                        <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                          Website
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
