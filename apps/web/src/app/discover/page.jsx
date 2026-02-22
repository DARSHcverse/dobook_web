"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://www.do-book.com";
}

export function generateMetadata() {
  const base = resolveSiteUrl();
  const title = "Find Nearby Services | DoBook";
  const description = "Search for nearby businesses that use DoBook for online bookings.";
  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: "/discover" },
    robots: { index: true, follow: true },
  };
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

export default function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = useMemo(() => String(searchParams?.get("q") || ""), [searchParams]);
  const initialPostcode = useMemo(() => String(searchParams?.get("postcode") || ""), [searchParams]);

  const [q, setQ] = useState(initialQ);
  const [postcode, setPostcode] = useState(initialPostcode);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

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
  }, []);

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
          <div className="flex items-center gap-3">
            <img src="/brand/dobook-logo.png" alt="DoBook" className="h-10 w-auto" draggable={false} />
            <div className="font-semibold">Find nearby services</div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 rounded-full" onClick={() => router.push("/auth")}>
              Business login
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-6">
        <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle style={{ fontFamily: "Manrope" }}>Search</CardTitle>
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
            {results.map((b) => (
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
                      <div className="font-semibold truncate" style={{ fontFamily: "Manrope" }}>
                        {b.business_name}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{b.industry}</div>
                    </div>
                  </div>
                  {b.public_description ? (
                    <div className="text-sm text-zinc-700 leading-6 line-clamp-4">{b.public_description}</div>
                  ) : (
                    <div className="text-sm text-zinc-500">No description provided.</div>
                  )}
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
                    {asList(b.booth_types).length ? (
                      <div className="truncate mt-1">{asList(b.booth_types).slice(0, 3).join(" • ")}</div>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 rounded-xl"
                      onClick={() => router.push(b.booking_url || `/book/${b.id}`)}
                    >
                      Book now
                    </Button>
                    {b.public_website ? (
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={() => window.open(String(b.public_website), "_blank", "noopener,noreferrer")}
                      >
                        Website
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

