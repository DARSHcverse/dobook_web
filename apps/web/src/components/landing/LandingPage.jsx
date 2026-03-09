import Link from "next/link";

import LandingCtaClient from "@/components/landing/LandingCtaClient";

export default function LandingPage({
  heroPrefix = "Online Booking System",
  heroAccent = "for Businesses",
  heroDescription = "DoBook is an all-in-one online booking system and appointment scheduling software for service businesses. Manage appointments, clients, invoices, reminders, and payments — free or Pro plans available.",
  getStartedHref = "/auth",
  startFreeHref = "/auth?mode=signup&plan=free",
  customerHref = "/discover",
} = {}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            aria-label="DoBook home"
          >
            <img src="/brand/dobook-logo.png" alt="DoBook" className="h-10 w-auto" draggable={false} />
            <div className="font-semibold text-zinc-900">DoBook</div>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href={customerHref}
              className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Find services
            </Link>
            <Link
              href="/auth"
              className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Business login
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <section className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 text-rose-700 px-4 py-2 text-xs font-semibold border border-rose-100">
              All-in-one booking + invoices
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900">
              {heroPrefix}{" "}
              <span className="text-rose-600">{heroAccent}</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-zinc-700 leading-7 max-w-2xl">
              {heroDescription}
            </p>

            <div className="mt-8">
              <LandingCtaClient
                getStartedHref={getStartedHref}
                startFreeHref={startFreeHref}
                customerHref={customerHref}
              />
            </div>

            <div className="mt-6 text-xs text-zinc-600">
              No credit card required for the Free plan. Upgrade anytime.
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm p-6">
              <div className="text-sm font-semibold text-zinc-900">What you get</div>
              <ul className="mt-4 space-y-3 text-sm text-zinc-700">
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
                  Online booking widget (share link or embed)
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
                  Calendar, bookings list, and reminders
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
                  Invoice templates with payments support
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
                  Optional public profile in the directory
                </li>
              </ul>

              <div className="mt-6 rounded-2xl bg-zinc-50 border border-zinc-200 p-4">
                <div className="text-xs font-semibold text-zinc-900">Popular searches</div>
                <div className="mt-2 text-xs text-zinc-700">
                  online booking system • appointment scheduling • booking system for small business
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Faster bookings",
              desc: "Give customers a link they can use 24/7. Reduce back-and-forth messages.",
            },
            {
              title: "Less admin",
              desc: "Keep bookings, invoices, and customer details in one place.",
            },
            {
              title: "Look professional",
              desc: "Use clean invoice templates and share a branded booking experience.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-base font-bold text-zinc-900">{f.title}</div>
              <div className="mt-2 text-sm text-zinc-700 leading-6">{f.desc}</div>
            </div>
          ))}
        </section>

        <footer className="mt-16 border-t border-zinc-200 pt-8 text-sm text-zinc-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} DoBook</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="hover:text-zinc-900" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-zinc-900" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-zinc-900" href="/policies/cancellation">
              Cancellation policy
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
