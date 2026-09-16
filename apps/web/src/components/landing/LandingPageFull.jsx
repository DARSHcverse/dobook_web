'use client';

// Extracted from App.js so the marketing routes (/ and /industries/*) no longer
// pull in the entire dashboard bundle. This module must stay free of dashboard
// imports — that coupling is exactly what made every landing visitor download
// the bookings, staff, invoice and enquiry UI.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Calendar,
  CreditCard,
  FileText,
  Link2,
  List,
  MapPin,
  MessageSquare,
  Search,
  Smartphone,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ThemeModeToggle from '@/components/app/ThemeModeToggle';
import InstantSetupHero from '@/components/landing/InstantSetupHero';
import { PRO_PRICE_AUD } from '@/lib/pricing';
import { API, DOBOOK_LOGO_PNG, DOBOOK_LOGO_SVG, bookingStatusBadgeClass } from '@/lib/appShared';

// ============= Landing Page =============
export default function LandingPage({
  heroPrefix = 'Online Booking System',
  heroAccent = 'for Businesses',
  heroDescription = 'DoBook is an all-in-one online booking system and appointment scheduling software for service businesses. Manage appointments, clients, invoices, reminders, and payments — free or Pro plans available.',
  getStartedHref = '/auth',
  startFreeHref = '/auth?mode=signup&plan=free',
  customerHref = '/discover',
} = {}) {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState({ authed: false, business: null });
  const [heroPreviewTab, setHeroPreviewTab] = useState('bookings');
  const [productPreviewTab, setProductPreviewTab] = useState('bookings');
  const [platformReviews, setPlatformReviews] = useState([]);

  const isAuthed = authReady && Boolean(session?.authed);
  const businessName = String(session?.business?.business_name || session?.business?.email || '').trim();
  const avatarUrl = String(session?.business?.logo_url || '').trim();

  const initials = useMemo(() => {
    const value = String(businessName || '').trim();
    if (!value) return 'DB';
    const parts = value.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || '';
    const b = parts.length > 1 ? parts[1]?.[0] || '' : parts[0]?.[1] || '';
    const out = `${a}${b}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return out || 'DB';
  }, [businessName]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          setSession({ authed: false, business: null });
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setSession({ authed: true, business: data?.business || null });
      } catch {
        if (!cancelled) setSession({ authed: false, business: null });
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const uiPreviewTabs = [
    { id: 'bookings', label: 'Bookings' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'invoices', label: 'Invoices' },
  ];

  const tabClass = (active) =>
    `h-9 px-3 rounded-full text-xs font-semibold border transition-colors ${
      active
        ? 'bg-rose-600 border-rose-600 text-white'
        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    }`;

  // One shared surface treatment for every marketing card. Previously each card
  // was a flat `border + shadow-sm` box, which made the whole page read as one
  // uniform sheet with no focal point. The lift on hover gives the grids a sense
  // of depth and signals that the cards are worth reading.
  const surfaceCard =
    'group rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-12px_rgba(24,24,27,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_2px_4px_rgba(24,24,27,0.05),0_18px_40px_-16px_rgba(225,29,72,0.28)] motion-reduce:transform-none motion-reduce:transition-none';


  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`${API}/public/platform-reviews`, { method: 'GET' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setPlatformReviews(Array.isArray(json) ? json : []);
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  function UiPreviewContent({ tab }) {
    const normalizedTab = new Set(['bookings', 'calendar', 'invoices']).has(tab) ? tab : 'bookings';
    const Sidebar = () => (
      <div className="hidden sm:block w-44 shrink-0 border-r border-zinc-200 bg-white">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-rose-600" aria-hidden="true" />
            <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              DoBook
            </div>
          </div>
        </div>
        <div className="px-3 pb-4 space-y-1 text-xs" style={{ fontFamily: 'Inter' }}>
          {[
            { id: 'bookings', label: 'Bookings' },
            { id: 'calendar', label: 'Calendar View' },
            { id: 'invoices', label: 'Invoice Templates' },
          ].map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                normalizedTab === item.id
                  ? 'bg-rose-50 border-rose-100 text-rose-700'
                  : 'bg-white border-transparent text-zinc-700'
              }`}
            >
              <span className="font-medium">{item.label}</span>
              {normalizedTab === item.id ? <span className="text-[10px] font-semibold">Active</span> : null}
            </div>
          ))}
        </div>
      </div>
    );

    if (normalizedTab === 'bookings') {
      return (
        <div className="flex min-h-[22rem]">
          <Sidebar />
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  All bookings
                </div>
                <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                  Manage appointments in one list
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-24 rounded-full bg-rose-600 text-white text-xs font-semibold flex items-center justify-center">
                  + Add booking
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] gap-2 px-4 py-3 text-[11px] font-semibold text-zinc-500 border-b border-zinc-200">
                <div>Customer</div>
                <div>Service</div>
                <div>Date</div>
                <div>Status</div>
              </div>
              {[
                { name: 'Alex M.', service: 'Consult', date: '26 Mar', tone: 'success', status: 'confirmed' },
                { name: 'Priya S.', service: 'Follow-up', date: '07 Mar', tone: 'success', status: 'confirmed' },
                { name: 'Chris L.', service: 'Session', date: '21 Feb', tone: 'danger', status: 'cancelled' },
                { name: 'Jordan P.', service: 'Initial', date: '17 Feb', tone: 'success', status: 'confirmed' },
              ].map((row) => (
                <div key={`${row.name}-${row.date}`} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] gap-2 px-4 py-3 text-xs text-zinc-700 border-b border-zinc-100 last:border-b-0">
                  <div className="flex min-w-0 items-center">
                    <div className="truncate font-semibold text-zinc-900">{row.name}</div>
                  </div>
                  <div className="flex min-w-0 items-center">
                    <div className="truncate font-medium">{row.service}</div>
                  </div>
                  <div className="flex shrink-0 items-center whitespace-nowrap text-[11px] text-zinc-600">{row.date}</div>
                  <div className="flex shrink-0 items-center justify-end">
                    <Badge
                      variant="outline"
                      className={`${bookingStatusBadgeClass(String(row.status || 'confirmed').toLowerCase())} whitespace-nowrap`}
                    >
                      {String(row.status || 'confirmed').toLowerCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'calendar') {
      return (
        <div className="flex min-h-[22rem]">
          <Sidebar />
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  Calendar view
                </div>
                <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                  Month / week / day scheduling
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-24 rounded-full bg-rose-600 text-white text-xs font-semibold flex items-center justify-center">
                  Month
                </div>
                <div className="h-9 w-24 rounded-full border border-zinc-200 bg-white text-zinc-700 text-xs font-semibold flex items-center justify-center">
                  Week
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="grid grid-cols-7 gap-2 text-[10px] font-semibold text-zinc-500 px-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center">{d}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {Array.from({ length: 28 }).map((_, i) => {
                  const day = i + 1;
                  const hasEvent = day === 17 || day === 19 || day === 20 || day === 28;
                  return (
                    <div
                      key={day}
                      className={`h-16 rounded-xl border border-zinc-200 bg-zinc-50 p-2 ${
                        day === 22 ? 'bg-rose-50 border-rose-100' : ''
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-zinc-600">{String(day).padStart(2, '0')}</div>
                      {hasEvent ? (
                        <div className="mt-2 h-4 rounded-full bg-rose-600/90" aria-hidden="true" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (normalizedTab === 'invoices') {
      return (
        <div className="flex min-h-[22rem]">
          <Sidebar />
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  Invoice templates
                </div>
                <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                  Choose a style that fits your brand
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-9 w-28 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center justify-center">
                  Active: Sidebar
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { name: 'Classic', accent: 'bg-zinc-900' },
                { name: 'Clean', accent: 'bg-zinc-200' },
                { name: 'Gradient', accent: 'bg-gradient-to-r from-rose-600 to-violet-600' },
                { name: 'Sidebar', accent: 'bg-zinc-800 ring-2 ring-rose-200' },
              ].map((t) => (
                <div key={t.name} className="rounded-2xl border border-zinc-200 bg-white p-3">
                  <div className={`h-8 rounded-xl ${t.accent}`} aria-hidden="true" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{t.name}</div>
                    {t.name === 'Sidebar' ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700">
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 h-10 rounded-xl bg-zinc-50 border border-zinc-200" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <style>{`html{scroll-behavior:smooth} @media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-3 flex items-center justify-between gap-3">
          <a
            href="/"
            className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200"
            aria-label="DoBook home"
            onClick={(e) => {
              if (typeof window !== 'undefined' && window.location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              e.preventDefault();
              router.push('/');
            }}
          >
            <img
              src={DOBOOK_LOGO_PNG}
              alt="DoBook"
              className="h-[68px] md:h-[76px] w-auto object-contain select-none"
              draggable={false}
              onError={(e) => {
                e.currentTarget.src = DOBOOK_LOGO_SVG;
              }}
            />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-700 dark:text-zinc-200" aria-label="Primary">
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#features">Features</a>
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#how">How it works</a>
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#pricing">Pricing</a>
            <a className="hover:text-zinc-900 dark:hover:text-white" href="#faq">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeModeToggle
              showLabel={false}
              className="h-11 w-11 p-0 rounded-full border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(customerHref)}
              className="h-11 px-4 rounded-lg text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
            >
              Find services
            </Button>

            {authReady ? (
              isAuthed ? (
                <>
                  <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5">
                    <Avatar className="h-9 w-9">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={businessName || 'DoBook profile'} /> : null}
                      <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="max-w-[14rem]">
                      <div className="text-xs font-semibold text-zinc-900 truncate" style={{ fontFamily: 'Manrope' }}>
                        {businessName || 'Your account'}
                      </div>
                      <div className="text-[11px] text-zinc-500">Logged in</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Open dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    data-testid="login-btn"
                    type="button"
                    variant="outline"
                    onClick={() => router.push(getStartedHref)}
                    className="h-11 px-5 rounded-lg border-zinc-200"
                  >
                    Login
                  </Button>
                  <Button
                    data-testid="get-started-btn"
                    type="button"
                    onClick={() => router.push(startFreeHref)}
                    className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Start Free (Business)
                  </Button>
                </>
              )
            ) : null}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeModeToggle
              showLabel={false}
              className="h-11 w-11 p-0 rounded-full border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
            />
            <details className="relative">
              <summary className="list-none cursor-pointer">
                <span className="sr-only">Open menu</span>
                <div className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 dark:border-zinc-800/60 dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-zinc-800/50">
                  <List className="h-4 w-4" />
                  Menu
                </div>
              </summary>
              <div className="absolute right-0 mt-2 w-[min(92vw,22rem)] rounded-2xl border border-zinc-200 bg-white shadow-lg p-3 dark:border-zinc-800/60 dark:bg-zinc-950">
                <div className="grid gap-1">
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#features">
                    Features
                  </a>
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#how">
                    How it works
                  </a>
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#pricing">
                    Pricing
                  </a>
                  <a className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50" href="#faq">
                    FAQ
                  </a>
                </div>
                <div className="mt-2 grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
                    onClick={() => router.push(customerHref)}
                  >
                    Find services near me
                  </Button>
                  {authReady ? (
                    isAuthed ? (
                      <Button
                        type="button"
                        className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                        onClick={() => router.push('/dashboard')}
                      >
                        Open dashboard
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-lg border-zinc-200 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
                          onClick={() => router.push(getStartedHref)}
                        >
                          Business login
                        </Button>
                        <Button
                          type="button"
                          className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                          onClick={() => router.push(startFreeHref)}
                        >
                          Start Free (Business)
                        </Button>
                      </>
                    )
                  ) : null}
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {/* Hero. The soft radial wash and grid give the section depth so the page
          does not read as one flat sheet of white cards. Both are pure CSS and
          pointer-events-none, so they cost nothing and never trap clicks. */}
      <section id="top" className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(900px circle at 12% -10%, rgba(225,29,72,0.10), transparent 55%), radial-gradient(700px circle at 92% 0%, rgba(244,63,94,0.08), transparent 50%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(24,24,27,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(24,24,27,0.045) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(700px circle at 50% 0%, #000 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(700px circle at 50% 0%, #000 30%, transparent 75%)',
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-14 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
              <span className="inline-flex h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
              Online booking system · appointment scheduling software
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              {heroPrefix} <span className="text-rose-600">{heroAccent}</span>
            </h1>

            <p className="mt-4 text-lg text-zinc-600" style={{ fontFamily: 'Inter' }}>
              {heroDescription}
            </p>

            <ul className="mt-6 grid gap-3 text-sm text-zinc-700" style={{ fontFamily: 'Inter' }} aria-label="Key benefits">
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span><span>Fill your calendar with <strong className="text-zinc-900">24/7 online bookings</strong>.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span><span>Reduce no‑shows with <strong className="text-zinc-900">email & SMS reminders</strong>.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span><span>Get paid faster with <strong className="text-zinc-900">online payments</strong>.</span></li>
              <li className="flex gap-3"><span className="mt-0.5 text-emerald-600" aria-hidden="true">✓</span><span>Look professional with <strong className="text-zinc-900">invoice PDFs</strong>.</span></li>
            </ul>

            {!isAuthed && <InstantSetupHero />}

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                data-testid="hero-get-started-btn"
                type="button"
                onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
                className="h-14 px-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
              </Button>
              <Button
                data-testid="hero-customer-btn"
                type="button"
                variant="outline"
                onClick={() => router.push(customerHref)}
                className="h-14 px-10 rounded-xl border-zinc-200"
              >
                Find services near me
              </Button>
            </div>

            <div className="mt-3 text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
              No credit card required for Free. Upgrade anytime.
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div>
                <div className="text-xs font-medium text-zinc-500">Trust</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">Used by 1,000+ businesses</div>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500">Built for</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">Local service teams</div>
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-500">Setup</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">~5 minutes</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-zinc-500">UI preview</div>
                  <span className="hidden sm:inline text-[11px] text-zinc-400">·</span>
                  <div className="hidden sm:flex items-center gap-2" role="tablist" aria-label="UI preview tabs">
                    {uiPreviewTabs.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={heroPreviewTab === t.id}
                        className={tabClass(heroPreviewTab === t.id)}
                        onClick={() => setHeroPreviewTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-zinc-50">
                <div className="sm:hidden flex flex-wrap gap-2 mb-4" role="tablist" aria-label="UI preview tabs">
                  {uiPreviewTabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={heroPreviewTab === t.id}
                      className={tabClass(heroPreviewTab === t.id)}
                      onClick={() => setHeroPreviewTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                  <UiPreviewContent tab={heroPreviewTab} />
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Social Proof */}
      {/* Social proof section removed */}

      {/* Features Section */}
      <section id="who-for" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            Who DoBook is for
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            Built for small to medium service businesses that want a booking system for small business needs—fast setup, clear schedules, and happier customers.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Salons', desc: 'Appointments, staff schedules, repeat clients, and add‑on services—organized.' },
            { title: 'Medical / Wellness', desc: 'Reduce no‑shows with reminders and keep client history at your fingertips.' },
            { title: 'Consultants', desc: 'Share a link, book paid sessions, and send invoice PDFs automatically.' },
            { title: 'Education / Tutoring', desc: 'Run recurring sessions, manage families, and stay on top of payments.' },
            { title: 'Home services', desc: 'Capture job details, route bookings, and keep a clean calendar.' },
            { title: 'Freelancers', desc: 'Look professional from day one with client-friendly booking and invoices.' },
          ].map((item) => (
            <Card key={item.title} className={surfaceCard}>
              <CardContent className="p-6 space-y-2">
                <div className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{item.title}</div>
                <div className="text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{item.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="features" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              Key features that drive bookings (and reduce admin)
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              Everything you expect from modern appointment scheduling software—plus the essentials service businesses need day to day.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Calendar, title: 'Smart calendar & scheduling', desc: 'Availability rules, buffers, and clean views that prevent double bookings.' },
              { icon: FileText, title: 'Automatic invoicing (PDF)', desc: 'Generate invoices from bookings and share professional PDF invoices in seconds.' },
              { icon: Bell, title: 'Email & SMS reminders', desc: 'Reduce no‑shows with confirmations, reminders, and follow-ups automatically.' },
              { icon: CreditCard, title: 'Online payments', desc: 'Accept deposits or full payment at booking so cash flow stays predictable.' },
              { icon: Users, title: 'Client management', desc: 'Keep customer history, notes, and contact details organized for better service.' },
              { icon: BarChart3, title: 'Analytics dashboard', desc: 'See revenue trends, top services, and booking patterns at a glance.' },
              { icon: Link2, title: 'Embed booking widget', desc: 'Add “Book now” to your website so clients can schedule without leaving your brand.' },
              { icon: Smartphone, title: 'Mobile‑friendly booking', desc: 'A fast booking flow designed for phones—where most customers book.' },
              { icon: MessageSquare, title: 'Multi‑staff support', desc: 'Assign services to staff and manage schedules as you grow.' },
            ].map((f) => (
              <Card key={f.title} className="group bg-white border border-zinc-200/80 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.12)] hover:border-rose-200 hover:-translate-y-1 transition-all duration-300 ease-out">
                <CardHeader className="space-y-3">
                  <div className="h-12 w-12 bg-rose-100 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:bg-rose-600">
                    <f.icon className="h-6 w-6 text-rose-700 transition-colors duration-300 group-hover:text-white" aria-hidden="true" />
                  </div>
                  <CardTitle style={{ fontFamily: 'Manrope' }}>{f.title}</CardTitle>
                  <CardDescription style={{ fontFamily: 'Inter' }}>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            How it works
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            A simple flow designed for real service business scheduling—set up once, then let customers book themselves.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 lg:grid-cols-4" aria-label="How DoBook works">
          {[
            { step: 'Step 1', title: 'Set up your services', desc: 'Add durations, pricing, staff, and availability.' },
            { step: 'Step 2', title: 'Share your booking link', desc: 'Post it on your site, socials, Google, or email.' },
            { step: 'Step 3', title: 'Customers book instantly', desc: 'Clients choose a time, pay (optional), and get confirmed.' },
            { step: 'Step 4', title: 'Get paid & manage clients', desc: 'Invoices, reminders, and client history—organized.' },
          ].map((s) => (
            <Card key={s.step} className={surfaceCard}>
              <CardContent className="p-6 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">{s.step}</div>
                <div className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{s.title}</div>
                <div className="text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{s.desc}</div>
              </CardContent>
            </Card>
          ))}
        </ol>
      </section>

      {/* Product screenshots / UI preview */}
      <section id="preview" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              Product preview
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              A quick look at the core screens: bookings, calendar, and invoice templates.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Product preview tabs">
            {uiPreviewTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={productPreviewTab === t.id}
                className={tabClass(productPreviewTab === t.id)}
                onClick={() => setProductPreviewTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 shadow-sm overflow-hidden">
            <UiPreviewContent tab={productPreviewTab} />
          </div>
        </div>
      </section>

      {/* Why choose DoBook */}
      <section id="why" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            Why choose DoBook
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            DoBook is built for local service businesses—simpler than complex systems, affordable, and truly all‑in‑one.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {[
            { title: 'Simpler than complex systems', desc: 'Clean defaults and a guided setup that gets you live quickly.' },
            { title: 'Affordable pricing', desc: 'Start free, then upgrade when automation and unlimited bookings matter.' },
            { title: 'Built for local businesses', desc: 'Perfect for salons, clinics, consultants, tutors, repairs, and freelancers.' },
            { title: 'All‑in‑one (no extra tools)', desc: 'Scheduling, reminders, invoices, and payments—together so nothing falls through.' },
            { title: 'Fast setup (minutes)', desc: 'Add services, set availability, share your link—done.' },
          ].map((d) => (
            <Card key={d.title} className={surfaceCard}>
              <CardContent className="p-6 space-y-2">
                <div className="text-base font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>{d.title}</div>
                <div className="text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{d.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Find services near me (secondary goal) */}
      <section id="find" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                Find services near me
              </h2>
              <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
                Customers can search for nearby businesses and book instantly. (Search routes to the DoBook directory.)
              </p>

              <form
                className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const q = String(form.get('q') || '').trim();
                  const postcode = String(form.get('postcode') || '').trim();
                  const query = new URLSearchParams();
                  if (q) query.set('q', q);
                  if (postcode) query.set('postcode', postcode);
                  router.push(`/discover${query.toString() ? `?${query.toString()}` : ''}`);
                }}
                aria-label="Find services"
              >
                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="sm:col-span-3">
                    <label className="text-xs font-semibold text-zinc-700" htmlFor="discover_q">Service</label>
                    <div className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3">
                      <MapPin className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                      <input
                        id="discover_q"
                        name="q"
                        type="text"
                        placeholder="e.g., barber, physio, tutor"
                        className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-700" htmlFor="discover_postcode">Postcode</label>
                    <input
                      id="discover_postcode"
                      name="postcode"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g., 2000"
                      className="mt-1 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-rose-100 focus:border-rose-500"
                    />
                  </div>
                </div>
                <Button type="submit" className="mt-3 h-11 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                  Search
                </Button>
              </form>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  Nearby businesses
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    { name: 'Northside Barber Co.', meta: 'Barber · 1.2 km away' },
                    { name: 'Calm Path Therapy', meta: 'Wellness · 2.6 km away' },
                    { name: 'Ace Math Tutoring', meta: 'Tutoring · 3.9 km away' },
                  ].map((r) => (
                    <div key={r.name} className="rounded-2xl bg-white border border-zinc-200 p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-900">{r.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">{r.meta}</div>
                      </div>
                      <Button type="button" className="h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white" onClick={() => router.push(customerHref)}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section — internal links help these pages get indexed and rank */}
      <section id="industries" className="border-t border-zinc-200 bg-zinc-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              A booking system for your industry
            </h2>
            <p className="mt-3 text-lg text-zinc-600" style={{ fontFamily: 'Inter' }}>
              DoBook adapts to how your business works — with the right booking fields, services, and workflow for your trade.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { slug: 'salon', label: 'Salons & Barbershops' },
              { slug: 'beauty', label: 'Beauty & Spa' },
              { slug: 'doctor', label: 'Clinics & Practitioners' },
              { slug: 'fitness', label: 'Personal Trainers' },
              { slug: 'pet', label: 'Pet Grooming & Sitting' },
              { slug: 'cleaning', label: 'Cleaning Businesses' },
              { slug: 'tradie', label: 'Tradies & Home Services' },
              { slug: 'automotive', label: 'Mechanics & Auto' },
              { slug: 'events', label: 'Photographers & Events' },
              { slug: 'photobooth', label: 'Photo Booth Hire' },
              { slug: 'tutor', label: 'Tutors & Educators' },
              { slug: 'consultant', label: 'Consultants & Coaches' },
              { slug: 'restaurant', label: 'Restaurants & Venue Hire' },
              { slug: 'legal', label: 'Legal & Advisors' },
            ].map((ind) => (
              <a
                key={ind.slug}
                href={`/industries/${ind.slug}`}
                className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-rose-300 hover:bg-rose-50/50 hover:shadow-[0_8px_20px_-12px_rgba(225,29,72,0.4)] transition-all duration-200"
              >
                <span className="truncate">{ind.label}</span>
                <span className="text-zinc-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
            Pricing
          </h2>
          <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
            Two plans. No surprises. Upgrade when you want invoice PDFs, reminders, and unlimited bookings.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          <Card className="bg-white border border-zinc-200 rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_36px_-18px_rgba(0,0,0,0.14)] transition-shadow duration-300">
            <CardHeader className="space-y-2">
              <CardTitle style={{ fontFamily: 'Manrope' }}>FREE</CardTitle>
              <CardDescription style={{ fontFamily: 'Inter' }}>
                <span className="text-3xl font-bold text-zinc-900">$0</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="text-sm text-zinc-700 space-y-2" style={{ fontFamily: 'Inter' }} aria-label="Free plan">
                <li>• Up to 50 bookings/month</li>
                <li>• Confirmation emails</li>
                <li>• Calendar + dashboard</li>
                <li>• Booking widget</li>
                <li>• Basic client management</li>
                <li>• Up to 2 staff members</li>
              </ul>
              <Button
                type="button"
                onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold text-white"
              >
                {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
              </Button>
              <div className="text-xs text-zinc-500 text-center" style={{ fontFamily: 'Inter' }}>No credit card required.</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-rose-200 rounded-3xl relative overflow-hidden ring-1 ring-rose-100 shadow-[0_8px_30px_-12px_rgba(225,29,72,0.25)] hover:shadow-[0_20px_44px_-16px_rgba(225,29,72,0.35)] hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -top-10 -right-10 h-40 w-40 bg-rose-100 rounded-full blur-2xl" aria-hidden="true" />
            <div className="absolute top-4 right-4 bg-rose-600 text-white text-xs font-semibold px-3 py-1 rounded-full" style={{ fontFamily: 'Inter' }}>
              Most Popular
            </div>
            <CardHeader className="space-y-2">
              <CardTitle style={{ fontFamily: 'Manrope' }}>PRO</CardTitle>
              <CardDescription style={{ fontFamily: 'Inter' }}>
                <span className="text-3xl font-bold text-zinc-900">${PRO_PRICE_AUD}</span>{' '}
                <span className="text-sm font-medium text-zinc-600">AUD/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="text-sm text-zinc-700 space-y-2" style={{ fontFamily: 'Inter' }} aria-label="Pro plan">
                <li>• Unlimited bookings</li>
                <li>• Unlimited staff members</li>
                <li>• Invoice PDFs</li>
                <li>• Automated email reminders</li>
                <li>• SMS reminders (coming soon)</li>
                <li>• Google Calendar sync (coming soon)</li>
                <li>• Priority support</li>
                <li>• Remove DoBook branding from booking page</li>
              </ul>
              <Button
                type="button"
                onClick={() => router.push(isAuthed ? '/dashboard' : '/auth?plan=pro')}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold text-white"
              >
                {isAuthed ? 'Open dashboard' : 'Choose Pro'}
              </Button>
              <div className="text-xs text-zinc-500 text-center" style={{ fontFamily: 'Inter' }}>Cancel anytime. No lock-in contracts.</div>
            </CardContent>
          </Card>
        </div>

        {/* Feature comparison table */}
        <div className="mt-12 max-w-5xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-zinc-700 font-semibold" style={{ fontFamily: 'Manrope' }}>Feature</TableHead>
                <TableHead className="text-center text-zinc-700 font-semibold" style={{ fontFamily: 'Manrope' }}>Free</TableHead>
                <TableHead className="text-center bg-rose-50 text-rose-700 font-semibold rounded-t-lg" style={{ fontFamily: 'Manrope' }}>Pro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { feature: 'Bookings per month', free: '50', pro: 'Unlimited' },
                { feature: 'Staff members', free: '2', pro: 'Unlimited' },
                { feature: 'Invoice PDFs', free: '❌', pro: '✅' },
                { feature: 'Email reminders', free: '✅', pro: '✅' },
                { feature: 'SMS reminders', free: '❌', pro: '✅' },
                { feature: 'Google Calendar sync', free: '❌', pro: '✅' },
                { feature: 'Custom booking fields', free: '❌', pro: '✅' },
                { feature: 'Remove branding', free: '❌', pro: '✅' },
                { feature: 'Priority support', free: '❌', pro: '✅' },
              ].map(({ feature, free, pro }) => (
                <TableRow key={feature}>
                  <TableCell className="text-zinc-700 text-sm" style={{ fontFamily: 'Inter' }}>{feature}</TableCell>
                  <TableCell className="text-center text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{free}</TableCell>
                  <TableCell className="text-center text-sm bg-rose-50 text-zinc-700" style={{ fontFamily: 'Inter' }}>{pro}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              What businesses say
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              Reviews from businesses using DoBook.
            </p>
          </div>

          {Array.isArray(platformReviews) && platformReviews.length ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {platformReviews.slice(0, 6).map((r) => (
                <Card key={r.id} className="bg-zinc-50 border border-zinc-200 shadow-sm rounded-3xl">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-zinc-900 truncate" style={{ fontFamily: 'Manrope' }}>
                        {r.business_name || 'Business'}
                      </div>
                      <div className="text-sm text-zinc-700" aria-label={`Rating ${r.rating || 0} out of 5`}>
                        {'★'.repeat(Math.max(0, Math.min(5, Number(r.rating || 0))))}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-700 leading-6 whitespace-pre-line" style={{ fontFamily: 'Inter' }}>
                      {r.comment}
                    </div>
                    {r.created_at ? (
                      <div className="text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-zinc-200 bg-zinc-50 p-8 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
              No published reviews yet.
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
              FAQ
            </h2>
            <p className="mt-2 text-zinc-600" style={{ fontFamily: 'Inter' }}>
              Quick answers about setup, payments, and how the booking flow works.
            </p>
          </div>

          <div className="mt-10 grid gap-4 max-w-3xl">
            {[
              { q: 'How fast can I set up DoBook?', a: 'Most businesses can add services, set availability, and share a booking link in about 10 minutes.' },
              { q: 'Can I take deposits or full payment online?', a: 'Yes. Choose per service whether to take a deposit, full payment, or keep payment optional.' },
              { q: 'Do customers get confirmations and reminders?', a: 'Confirmations are included on Free. Pro adds automated email & SMS reminders to reduce no‑shows.' },
              { q: 'What about cancellations and rescheduling?', a: 'Set your cancellation window and rescheduling rules to protect your time and keep your calendar stable.' },
              { q: 'Can I embed DoBook on my website?', a: 'Yes. Add a booking widget or link so visitors can schedule without leaving your brand.' },
              { q: 'Does it work on mobile?', a: 'Yes. The booking experience is mobile-first, and the dashboard is responsive for phones and tablets.' },
            ].map((item) => (
              <details key={item.q} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>
                  {item.q}
                </summary>
                <div className="mt-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-rose-600 py-20">
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope' }}>
            Start taking bookings today
          </h2>
          <p className="text-rose-100 text-lg mb-8" style={{ fontFamily: 'Inter' }}>
            Join service businesses using DoBook for appointment scheduling, payments, and invoices—without the admin overload.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              data-testid="cta-get-started-btn"
              type="button"
              onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
              className="h-14 px-10 bg-white text-rose-700 hover:bg-zinc-50 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(customerHref)}
              className="h-14 px-10 rounded-xl border-white/40 text-white bg-transparent hover:bg-white/10 hover:text-white"
            >
              Find services near me
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200"
                onClick={() => router.push('/')}
                aria-label="Go to DoBook home"
              >
                <img
                  src={DOBOOK_LOGO_PNG}
                  alt="DoBook"
                  className="h-[68px] md:h-[76px] w-auto object-contain select-none"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = DOBOOK_LOGO_SVG;
                  }}
                />
                <div className="text-lg font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>DoBook</div>
              </button>
              <p className="mt-3 text-sm text-zinc-600 max-w-md" style={{ fontFamily: 'Inter' }}>
                DoBook is an all‑in‑one online booking system for service businesses—appointment scheduling software with client management, invoices, reminders, and payments.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="#" aria-label="Twitter (placeholder)">Twitter</a>
                <a className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="#" aria-label="LinkedIn (placeholder)">LinkedIn</a>
                <a className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="#" aria-label="Instagram (placeholder)">Instagram</a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid gap-8 sm:grid-cols-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Product</div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    <a className="hover:text-zinc-900" href="#features">Features</a>
                    <a className="hover:text-zinc-900" href="#pricing">Pricing</a>
                    <button type="button" className="text-left hover:text-zinc-900" onClick={() => router.push(customerHref)}>Find services</button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Company</div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    <a className="hover:text-zinc-900" href="#">About</a>
                    <a className="hover:text-zinc-900" href="mailto:support@do-book.com">Contact</a>
                    <a className="hover:text-zinc-900" href="#">Careers</a>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Legal</div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    <a className="hover:text-zinc-900" href="/privacy">Privacy</a>
                    <a className="hover:text-zinc-900" href="/terms">Terms</a>
                    <a className="hover:text-zinc-900" href="/policies/cancellation">Cancellation policy</a>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-3xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-900" style={{ fontFamily: 'Manrope' }}>Ready to grow?</div>
                  <div className="mt-1 text-sm text-zinc-600" style={{ fontFamily: 'Inter' }}>
                    Start free and turn your booking flow into a revenue engine.
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => router.push(isAuthed ? '/dashboard' : startFreeHref)}
                  className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {isAuthed ? 'Open dashboard' : 'Start Free (Business)'}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-zinc-200 pt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-zinc-500" style={{ fontFamily: 'Inter' }}>
            <div>© {new Date().getFullYear()} DoBook. All rights reserved.</div>
            <div>online booking system · appointment scheduling software · booking system for small business · service business scheduling</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
