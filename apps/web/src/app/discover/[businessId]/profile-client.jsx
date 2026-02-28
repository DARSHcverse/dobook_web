"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function asList(value) {
  return Array.isArray(value) ? value : [];
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

export default function BusinessProfileClient({ businessId }) {
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const websiteUrl = useMemo(() => normalizeWebsiteUrl(business?.public_website), [business?.public_website]);
  const photos = asList(business?.public_photos).filter(Boolean);
  const services = useMemo(() => {
    const list = asList(business?.public_services).filter(Boolean);
    if (list.length) return list;
    return asList(business?.booth_types).filter(Boolean).map((name) => ({ name }));
  }, [business?.booth_types, business?.public_services]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/public/businesses/${encodeURIComponent(String(businessId || ""))}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.detail || "Business not found");
        }
        const json = await res.json();
        setBusiness(json);
      } catch (e) {
        setBusiness(null);
        setError(e?.message || "Failed to load business");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [businessId]);

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
            <div className="font-semibold">Business details</div>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 rounded-full" onClick={() => router.push("/discover")}>
              Back to search
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        {loading ? (
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardContent className="py-10 text-center text-zinc-600">Loading…</CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
          </Card>
        ) : business ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <aside className="lg:col-span-4">
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 rounded-2xl border border-zinc-200 bg-zinc-50 overflow-hidden flex-shrink-0">
                      <img
                        src={business.logo_url || "/brand/dobook-logo.png"}
                        alt={business.business_name || "Business"}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-2xl font-bold text-zinc-900 truncate" style={{ fontFamily: "Manrope" }}>
                        {business.business_name}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500 truncate">{business.industry || ""}</div>
                      <div className="mt-2 text-sm text-zinc-700">
                        <span className="font-semibold">★★★★★</span> <span className="text-zinc-500">(0)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Button className="h-11 bg-rose-600 hover:bg-rose-700 rounded-xl" onClick={() => router.push(`/book/${business.id}`)}>
                      Book now
                    </Button>
                    {websiteUrl ? (
                      <Button asChild variant="outline" className="h-11 rounded-xl">
                        <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                          Website
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {(business.public_postcode || business.business_address) ? (
                    <div className="text-sm text-zinc-600">
                      {business.public_postcode ? `Postcode: ${business.public_postcode}` : null}
                      {business.public_postcode && business.business_address ? " • " : null}
                      {business.business_address ? business.business_address : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </aside>

            <section className="lg:col-span-8">
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
                <CardContent className="p-6">
                  <Tabs defaultValue="about">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="about">About</TabsTrigger>
                      <TabsTrigger value="services">Services</TabsTrigger>
                      <TabsTrigger value="photos">Photos</TabsTrigger>
                      <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    </TabsList>

                    <TabsContent value="about" className="mt-6 space-y-4">
                      {business.public_description ? (
                        <div className="text-sm text-zinc-700 leading-6 whitespace-pre-line">{business.public_description}</div>
                      ) : (
                        <div className="text-sm text-zinc-500">No description provided.</div>
                      )}
                    </TabsContent>

                    <TabsContent value="services" className="mt-6 space-y-3">
                      {services.length ? (
                        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 overflow-hidden">
                          {services.map((s, idx) => (
                            <div key={`${s?.name || "service"}-${idx}`} className="p-4 bg-white">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-zinc-900 truncate">{s?.name || "Service"}</div>
                                  {s?.description ? (
                                    <div className="mt-1 text-sm text-zinc-600 whitespace-pre-line">{s.description}</div>
                                  ) : null}
                                </div>
                                {s?.price !== null && s?.price !== undefined && s?.price !== "" ? (
                                  <div className="text-sm font-semibold text-zinc-900 whitespace-nowrap">
                                    ${Number(s.price).toFixed(2)}
                                    {s?.unit ? <span className="text-zinc-500 font-medium">/{s.unit}</span> : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500">No services listed yet.</div>
                      )}
                    </TabsContent>

                    <TabsContent value="photos" className="mt-6">
                      {photos.length ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {photos.slice(0, 12).map((url, idx) => (
                            <a
                              key={`${url}-${idx}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50"
                            >
                              <img src={url} alt={`Photo ${idx + 1}`} className="h-32 w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500">No photos added yet.</div>
                      )}
                    </TabsContent>

                    <TabsContent value="reviews" className="mt-6">
                      <div className="text-sm text-zinc-500">Reviews coming soon.</div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
