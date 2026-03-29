"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function stars(rating) {
  const n = Math.max(0, Math.min(5, Number(rating || 0)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function ReviewInviteClient({ token }) {
  const router = useRouter();
  const safeToken = String(token || "").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const title = useMemo(() => (done ? "Thanks!" : "Leave a review"), [done]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!safeToken) {
        setError("Invalid link");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/public/review-invites/${encodeURIComponent(safeToken)}`);
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.detail || "Invalid or expired link");
        if (cancelled) return;
        setInvite(json?.invite || null);
        setCustomerName(String(json?.invite?.customer_name || "").trim());
      } catch (e) {
        if (cancelled) return;
        setInvite(null);
        setError(e?.message || "Failed to load review link");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [safeToken]);

  const handleSubmit = async () => {
    const ratingInt = Number.parseInt(String(rating || "0"), 10);
    const name = String(customerName || "").trim();
    const body = String(comment || "").trim();

    if (!name || name.length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!Number.isFinite(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      setError("Please choose a rating from 1 to 5.");
      return;
    }
    if (!body || body.length < 10) {
      setError("Please write at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/public/review-invites/${encodeURIComponent(safeToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingInt, comment: body, customer_name: name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.detail || "Failed to submit review");
      setDone(true);
    } catch (e) {
      setError(e?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200"
            onClick={() => router.push("/")}
            aria-label="Go to DoBook home"
          >
            <img src="/brand/dobook-logo.png" alt="DoBook" className="h-9 w-auto" draggable={false} />
            <div className="font-semibold">{title}</div>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {loading ? (
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardContent className="py-10 text-center text-zinc-600">Loading…</CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Review link</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => router.push("/")}>
                Go home
              </Button>
            </CardContent>
          </Card>
        ) : done ? (
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Thanks for your review</CardTitle>
              <CardDescription>Review submitted successfully.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="h-11 bg-rose-600 hover:bg-rose-700 rounded-xl" onClick={() => router.push("/discover")}>
                Find more services
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border border-zinc-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Leave a review</CardTitle>
              <CardDescription>Share your experience. {stars(Number(rating || 0))}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-zinc-700">Your name</div>
                  <Input className="bg-zinc-50 mt-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-700">Rating</div>
                  <Select value={String(rating)} onValueChange={(v) => setRating(String(v))}>
                    <SelectTrigger className="bg-zinc-50 mt-2 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-zinc-700">Comment</div>
                <Textarea
                  className="bg-zinc-50 mt-2 min-h-[140px]"
                  placeholder="What did you like or want improved?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={submitting || !invite}
                  className="h-11 px-6 bg-rose-600 hover:bg-rose-700 rounded-xl"
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting…" : "Submit review"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
