"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CreditCard, MessageSquare, Star } from "lucide-react";

// The right-hand panel of the split-screen auth page. It exists to keep selling
// while someone is signing in or signing up — the page previously left this
// half of the viewport empty. Hidden below lg: on small screens the form is the
// only thing that matters, and a tall marketing panel would push it off-screen.

const PROOF_POINTS = [
  {
    icon: CalendarCheck,
    title: "Bookings around the clock",
    body: "Clients book themselves in while you work or sleep. No phone tag.",
  },
  {
    icon: MessageSquare,
    title: "Fewer no-shows",
    body: "Automatic email and SMS reminders keep your calendar full.",
  },
  {
    icon: CreditCard,
    title: "Get paid faster",
    body: "Take deposits at booking and send invoice PDFs in a click.",
  },
];

export default function AuthBrandPanel() {
  // Only ever show a real, approved review. If none exists we fall back to a
  // factual product statement rather than inventing a customer quote.
  const [review, setReview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/platform-reviews", { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !Array.isArray(json)) return;
        const usable = json.find(
          (r) => String(r?.comment || "").trim() && Number(r?.rating) >= 4,
        );
        if (usable) setReview(usable);
      } catch {
        // Keep the fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative hidden h-full overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-between">
      {/* Brand wash. Pure CSS so this panel adds no image weight to the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px circle at 15% 0%, rgba(225,29,72,0.42), transparent 55%), radial-gradient(700px circle at 100% 100%, rgba(190,18,60,0.30), transparent 55%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            <span className="inline-flex h-2 w-2 rounded-full bg-rose-400" aria-hidden="true" />
            Booking software for service businesses
          </div>

          <h2
            className="mt-7 max-w-md text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl"
            style={{ fontFamily: "Manrope" }}
          >
            Run your bookings on autopilot.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70" style={{ fontFamily: "Inter" }}>
            Everything you need to take bookings, chase less paperwork and get paid — in one place.
          </p>

          <ul className="mt-10 space-y-6">
            {PROOF_POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-rose-300 backdrop-blur">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/60">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {review ? (
          <figure className="relative mt-12 rounded-2xl border border-white/12 bg-white/[0.07] p-6 backdrop-blur">
            <div
              className="flex gap-0.5 text-rose-300"
              aria-label={`Rating ${Number(review.rating) || 0} out of 5`}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < (Number(review.rating) || 0) ? "fill-current" : "opacity-30"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <blockquote
              className="mt-3 text-sm leading-relaxed text-white/85"
              style={{ fontFamily: "Inter" }}
            >
              {String(review.comment || "").trim()}
            </blockquote>
            <figcaption className="mt-4 text-xs text-white/55">
              {String(review.business_name || "").trim() || "DoBook customer"}
            </figcaption>
          </figure>
        ) : (
          <div className="relative mt-12 rounded-2xl border border-white/12 bg-white/[0.07] p-6 backdrop-blur">
            <div className="text-sm font-semibold text-white">Free to start</div>
            <p
              className="mt-2 text-sm leading-relaxed text-white/65"
              style={{ fontFamily: "Inter" }}
            >
              Create your booking page, take your first booking, and only upgrade when you need
              invoice PDFs, reminders and unlimited bookings. No card required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
