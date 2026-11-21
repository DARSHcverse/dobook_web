'use client';

// Marketing page for / and /industries/*. Must stay free of dashboard imports
// (see dobook-perf-root-cause): that coupling once made every visitor download
// the whole dashboard bundle.
//
// Copy rule: every claim here must be true in the code today. In particular,
// DoBook does NOT collect customer payments online (businesses add their own
// payment link and track paid/deposit status), so never promise checkout,
// deposits-at-booking or "get paid online". No volume-based social proof.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  Camera,
  Check,
  Code2,
  Globe,
  Inbox,
  List,
  MessageSquareText,
  PawPrint,
  Receipt,
  Scissors,
  Search,
  Sparkles,
  Star,
  UserCog,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ThemeModeToggle from '@/components/app/ThemeModeToggle';
import InstantSetupHero from '@/components/landing/InstantSetupHero';
import { PRO_PRICE_AUD, PLAN_COMPARISON, FREE_PLAN_FEATURES, PRO_PLAN_FEATURES, SETUP_TIME_LABEL } from '@/lib/pricing';
import { BOOKING_FIELDS_BY_TYPE, inferBookingTypeKey } from '@/lib/bookingFieldsByType';
import { API } from '@/lib/appShared';

const DOBOOK_LOGO_PNG = '/brand/dobook-logo-trim.png';

const CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-10';

// Example businesses for the hero mock-up only. They are labelled "Example"
// on screen; the form fields themselves come from the real per-trade config.
const DEMO_TRADES = [
  { key: 'salon_barbershop', label: 'Salon', icon: Scissors, biz: 'Fade & Co.', tagline: 'Barber · Cuts & beard trims', services: ['Skin fade', 'Beard trim', 'Kids cut'] },
  { key: 'photobooth', label: 'Photo booth', icon: Camera, biz: 'Flash Booth Hire', tagline: 'Weddings & corporate events', services: ['Open booth', 'Glam booth', '360 booth'] },
  { key: 'home_services_trades', label: 'Trades', icon: Wrench, biz: 'Northline Plumbing', tagline: 'Plumbing · Same-week jobs', services: ['Leak repair', 'Hot water', 'Blocked drain'] },
  { key: 'pet_services', label: 'Pet care', icon: PawPrint, biz: 'Paws & Suds', tagline: 'Grooming · Bathing', services: ['Full groom', 'Nail trim', 'Puppy bath'] },
  { key: 'restaurant_venue', label: 'Venues', icon: UtensilsCrossed, biz: 'The Laneway Room', tagline: 'Private dining & functions', services: ['Private dining', 'Function hire'] },
];

const CONTACT_KEYS = new Set(['customer_name', 'customer_email', 'customer_phone', 'notes', 'price']);

function demoValueFor(field) {
  switch (field.type) {
    case 'date':
      return 'Sat, 14 Dec';
    case 'time':
      return '10:30 am';
    case 'address':
      return 'Venue address';
    case 'number':
      return '80';
    case 'package_duration':
      return '3 hours';
    default:
      return 'Choose…';
  }
}

function tradeFields(typeKey) {
  const fields = BOOKING_FIELDS_BY_TYPE[typeKey] || BOOKING_FIELDS_BY_TYPE.photobooth;
  return fields.filter((f) => !CONTACT_KEYS.has(f.key) && f.type !== 'select_services').slice(0, 4);
}

const INDUSTRIES = [
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
];

const BEFORE_AFTER = [
  { before: 'Twelve messages to agree one date', after: 'One link. They pick the time themselves.' },
  { before: '“What was the venue address again?”', after: 'Your form asks the questions your trade needs.' },
  { before: 'Forgotten appointments and no-shows', after: 'Reminder emails go out on their own (Pro).' },
  { before: 'Writing invoices at 11pm', after: 'The invoice is drafted from the booking (Pro).' },
];

const FAQS = [
  { q: 'Is the free plan actually free?', a: 'Yes. Free covers 50 bookings a month with confirmation emails, and no card is needed to start. You only pay if you want unlimited bookings, automated reminders, Google Calendar sync and invoice PDFs.' },
  { q: 'How fast can I set up DoBook?', a: `Most businesses are taking bookings in ${SETUP_TIME_LABEL}. Pick your trade and your services, booking form and reminder timings are pre-filled, or paste your website and we draft the page for you.` },
  { q: 'Do my customers need an account?', a: 'No. They open your link, choose a time and enter their details. No app and no password, which is a big part of why people finish booking.' },
  { q: 'I mostly get enquiries, not bookings. Does it fit?', a: 'Yes. Turn on an enquiry page: customers send their event details, you reply with a quote (DoBook can draft the reply for you), they confirm, and it becomes a booking in one click.' },
  { q: 'Can customers pay online when they book?', a: 'Not inside DoBook yet. You can add your own payment link (Stripe, Square, PayPal and so on) to reminder emails, put your bank details on invoices, and mark each booking as unpaid, deposit paid or paid in full.' },
  { q: 'Can I put booking on my own website?', a: 'Yes. Copy the embed code from your dashboard and paste it into your site, or simply link to your DoBook page from your website, Instagram bio or Google profile.' },
  { q: 'Which countries does DoBook work in?', a: 'Each business sets its own country, currency and phone format, so your booking page and invoices match where you work. Pro is billed in AUD.' },
  { q: 'Can I cancel later?', a: 'Yes. There is no contract. Cancel Pro any time and you drop back to Free rather than losing access, and your bookings and client records stay yours.' },
];

// Trimmed 274x112 logo (10 KB WebP). The original dobook-logo.png is 2 MB
// and ~70% transparent padding, which is why it rendered tiny.
function BrandLogo({ className = '', priority = false }) {
  return (
    <img
      src="/brand/dobook-logo-trim.webp"
      alt="DoBook"
      width={274}
      height={112}
      fetchPriority={priority ? 'high' : undefined}
      className={`w-auto select-none object-contain ${className}`}
      draggable={false}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith('.png')) e.currentTarget.src = DOBOOK_LOGO_PNG;
      }}
    />
  );
}

function SectionHeading({ eyebrow, title, desc, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">{eyebrow}</div>
      ) : null}
      <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">{title}</h2>
      {desc ? <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">{desc}</p> : null}
    </div>
  );
}

// Phone-sized mock of a real DoBook booking page, switching between trades to
// show the one thing generic schedulers do not do: ask trade-specific questions.
function TradePhoneDemo({ initialTypeKey }) {
  const trades = useMemo(() => {
    if (!initialTypeKey || DEMO_TRADES.some((t) => t.key === initialTypeKey)) {
      const idx = DEMO_TRADES.findIndex((t) => t.key === initialTypeKey);
      return idx > 0 ? [DEMO_TRADES[idx], ...DEMO_TRADES.filter((_, i) => i !== idx)] : DEMO_TRADES;
    }
    return [
      { key: initialTypeKey, label: 'Your trade', icon: Sparkles, biz: 'Your business', tagline: 'Your booking page', services: [] },
      ...DEMO_TRADES,
    ];
  }, [initialTypeKey]);

  const [index, setIndex] = useState(0);
  const [userPicked, setUserPicked] = useState(false);

  useEffect(() => {
    if (userPicked) return undefined;
    let reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduce = false;
    }
    if (reduce) return undefined;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % trades.length), 3800);
    return () => window.clearInterval(id);
  }, [userPicked, trades.length]);

  const trade = trades[index] || trades[0];
  const fields = tradeFields(trade.key);
  const TradeIcon = trade.icon;

  return (
    <div className="relative mx-auto w-full max-w-[25rem]">
      <div className="mb-4 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Example booking pages by trade">
        {trades.map((t, i) => {
          const Icon = t.icon;
          const active = i === index;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setUserPicked(true);
                setIndex(i);
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                active
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                  : 'border-zinc-200 bg-white/80 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative rounded-[2.4rem] border border-zinc-200 bg-zinc-950 p-2.5 shadow-[0_40px_80px_-30px_rgba(225,29,72,0.45),0_20px_40px_-20px_rgba(24,24,27,0.35)] dark:border-zinc-700">
        <div className="overflow-hidden rounded-[1.9rem] bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between px-5 pb-2 pt-3 text-[10px] font-semibold text-zinc-400">
            <span>9:41</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">Example booking page</span>
          </div>

          <div key={trade.key} className="px-5 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white">
                <TradeIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="font-display truncate text-base font-bold text-zinc-950 dark:text-white">{trade.biz}</div>
                <div className="truncate text-xs text-zinc-500">{trade.tagline}</div>
              </div>
            </div>

            {trade.services.length ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {trade.services.map((s, i) => (
                  <span
                    key={s}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      i === 0
                        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4 h-[26px]" aria-hidden="true" />
            )}

            {/* Fixed height for 4 fields so rotating trades never shifts the layout (CLS). */}
            <div className="mt-4 min-h-[16rem] space-y-2.5">
              {fields.map((f) => (
                <div key={f.key}>
                  <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    {f.label}
                    {f.required ? <span className="text-rose-600"> *</span> : null}
                  </div>
                  <div className="mt-1 flex h-9 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60">
                    {demoValueFor(f)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex h-11 items-center justify-center rounded-xl bg-rose-600 text-sm font-semibold text-white">
              Request booking
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification: what the owner sees when the form is sent. */}
      <div
        aria-hidden="true"
        className="absolute -bottom-7 -left-3 hidden w-56 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:block lg:-left-16 dark:border-zinc-700 dark:bg-zinc-900/95 animate-in fade-in slide-in-from-left-4 duration-700 delay-500 fill-mode-both motion-reduce:animate-none"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CalendarCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-950 dark:text-white">New booking request</div>
            <div className="truncate text-[11px] text-zinc-500">{trade.services[0] || 'Appointment'} · Sat 14 Dec</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({
  heroPrefix = 'Stop taking bookings',
  heroAccent = 'in your DMs.',
  heroDescription = 'DoBook gives your business one booking link with a form built for your trade, so customers book themselves, reminders go out on their own and every job is already in your calendar. Free for up to 50 bookings a month.',
  startFreeHref = '/auth?mode=signup&plan=free',
  customerHref = '/discover',
  // Industry pages render their own unique <h1> above this component.
  heroHeadingLevel = 'h1',
  // Industry key (e.g. "salon") so the hero demo opens on that trade.
  industryKey = '',
} = {}) {
  const HeroHeading = heroHeadingLevel === 'h2' ? 'h2' : 'h1';
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState({ authed: false, business: null });
  const [platformReviews, setPlatformReviews] = useState([]);

  const isAuthed = authReady && Boolean(session?.authed);
  const businessName = String(session?.business?.business_name || session?.business?.email || '').trim();
  const avatarUrl = String(session?.business?.logo_url || '').trim();
  const primaryHref = isAuthed ? '/dashboard' : startFreeHref;
  const primaryLabel = isAuthed ? 'Open dashboard' : 'Start free';
  const demoTypeKey = industryKey ? inferBookingTypeKey({ industry: industryKey }) : '';

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
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' });
        if (cancelled) return;
        if (!res.ok) {
          setSession({ authed: false, business: null });
          return;
        }
        const data = await res.json();
        if (!cancelled) setSession({ authed: true, business: data?.business || null });
      } catch {
        if (!cancelled) setSession({ authed: false, business: null });
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/public/platform-reviews`, { method: 'GET' });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setPlatformReviews(Array.isArray(json) ? json : []);
      } catch {
        // Reviews are optional; the section simply stays hidden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryBtn =
    'h-12 rounded-xl bg-rose-600 px-7 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(225,29,72,0.7)] transition-all hover:bg-rose-700 hover:shadow-[0_14px_34px_-10px_rgba(225,29,72,0.8)] active:scale-[0.98]';

  const features = [
    { icon: Inbox, title: 'Enquiries that turn into bookings', desc: 'Event and project work starts with a question. Customers send their details, you send a quote, they confirm, and it becomes a booking in one click.', tier: 'Free' },
    { icon: MessageSquareText, title: 'Replies drafted for you', desc: 'DoBook drafts a reply to each enquiry from what the customer asked and what you offer. Edit it, send it, done.', tier: 'Free' },
    { icon: BellRing, title: 'Reminders that cut no-shows', desc: 'Customers get reminder emails before the day, with your payment link if you use one. You never send one by hand.', tier: 'Pro' },
    { icon: Receipt, title: 'Invoices written from the booking', desc: 'Pick a template once. Every booking can become a branded invoice PDF with your bank details on it.', tier: 'Pro' },
    { icon: CalendarCheck, title: 'Google Calendar sync', desc: 'New bookings land in the calendar you already live in; cancellations come off it.', tier: 'Pro' },
    { icon: UserCog, title: 'Your team, assigned', desc: 'Assign a booking to a staff member and they are emailed the details, so everyone knows where they need to be.', tier: 'Free' },
    { icon: Code2, title: 'Booking on your own website', desc: 'Paste the embed code into your site, or link to your page from Instagram, Google and email signatures.', tier: 'Free' },
    { icon: Globe, title: 'Get found on DoBook Discover', desc: 'Switch on a public profile with your services, photos and reviews so local customers can find and book you.', tier: 'Free' },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <style>{`html{scroll-behavior:smooth} @media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/70">
        <div className={`${CONTAINER} flex h-16 items-center justify-between gap-3`}>
          <Link href="/" className="flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300" aria-label="DoBook home">
            <BrandLogo className="h-10 sm:h-11" priority />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex dark:text-zinc-300" aria-label="Primary">
            <a className="hover:text-zinc-950 dark:hover:text-white" href="#features">Features</a>
            <a className="hover:text-zinc-950 dark:hover:text-white" href="#industries">Industries</a>
            <a className="hover:text-zinc-950 dark:hover:text-white" href="#pricing">Pricing</a>
            <a className="hover:text-zinc-950 dark:hover:text-white" href="#faq">FAQ</a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeModeToggle showLabel={false} className="h-10 w-10 rounded-full border-zinc-200 p-0 dark:border-zinc-800" />
            {isAuthed ? (
              <>
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <Avatar className="h-8 w-8">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt={businessName || 'Your business'} /> : null}
                    <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-[10rem] truncate text-xs font-semibold">{businessName || 'Your account'}</span>
                </div>
                <Button asChild className="h-10 rounded-xl bg-rose-600 px-5 font-semibold text-white hover:bg-rose-700">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" data-testid="login-btn" className="h-10 rounded-xl px-4 text-zinc-700 dark:text-zinc-200">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild data-testid="get-started-btn" className="h-10 rounded-xl bg-rose-600 px-5 font-semibold text-white hover:bg-rose-700">
                  <Link href={startFreeHref}>Start free</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeModeToggle showLabel={false} className="h-11 w-11 rounded-full border-zinc-200 p-0 dark:border-zinc-800" />
            <details className="relative">
              <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Open menu</span>
                <span className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <List className="h-4 w-4" aria-hidden="true" />
                  Menu
                </span>
              </summary>
              <div className="absolute right-0 mt-2 w-[min(92vw,20rem)] rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                <div className="grid gap-1">
                  {[
                    ['#features', 'Features'],
                    ['#industries', 'Industries'],
                    ['#pricing', 'Pricing'],
                    ['#faq', 'FAQ'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} className="rounded-xl px-3 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900">
                      {label}
                    </a>
                  ))}
                </div>
                <div className="mt-2 grid gap-2">
                  {isAuthed ? null : (
                    <Button asChild variant="outline" className="h-11 rounded-xl border-zinc-200 dark:border-zinc-800">
                      <Link href="/login">Log in</Link>
                    </Button>
                  )}
                  <Button asChild className="h-11 rounded-xl bg-rose-600 font-semibold text-white hover:bg-rose-700">
                    <Link href={primaryHref}>{primaryLabel}</Link>
                  </Button>
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="top" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(800px circle at 85% 10%, rgba(225,29,72,0.16), transparent 60%), radial-gradient(600px circle at 5% 90%, rgba(244,63,94,0.08), transparent 55%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-15"
            style={{
              backgroundImage: 'radial-gradient(rgba(24,24,27,0.10) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(600px circle at 70% 30%, #000 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(600px circle at 70% 30%, #000 20%, transparent 70%)',
            }}
          />

          <div className={`${CONTAINER} grid items-center gap-14 py-14 sm:py-20 lg:grid-cols-12 lg:gap-10 lg:py-24`}>
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Booking pages built for your trade
              </div>

              <HeroHeading className="font-display mt-6 text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-zinc-950 sm:text-6xl lg:text-7xl dark:text-white">
                {heroPrefix}{' '}
                <span className="bg-gradient-to-r from-rose-600 to-rose-500 bg-clip-text text-transparent">{heroAccent}</span>
              </HeroHeading>

              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">{heroDescription}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild data-testid="hero-get-started-btn" className={primaryBtn}>
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-xl border-zinc-300 bg-white/70 px-6 text-base font-semibold dark:border-zinc-700 dark:bg-zinc-900/60">
                  <a href="#how">See how it works</a>
                </Button>
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400" aria-label="Plan highlights">
                {['Free plan, no card', '50 bookings a month free', 'Live in about 10 minutes', 'Cancel any time'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5">
              <TradePhoneDemo initialTypeKey={demoTypeKey} />
            </div>
          </div>
        </section>

        {/* Instant setup band: the fastest route to a live page */}
        {!isAuthed ? (
          <section aria-labelledby="instant-heading" className="relative isolate overflow-hidden bg-zinc-950 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{ background: 'radial-gradient(700px circle at 15% 0%, rgba(225,29,72,0.35), transparent 60%)' }}
            />
            <div className={`${CONTAINER} grid items-center gap-8 py-14 sm:py-16 lg:grid-cols-2 lg:gap-14`}>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">Already have a website?</div>
                <h2 id="instant-heading" className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Paste your link. We will draft your booking page in about 30 seconds.
                </h2>
                <p className="mt-4 text-zinc-400">
                  DoBook reads your website or Instagram, picks out your services and builds a preview. No sign-up until you like what you see.
                </p>
              </div>
              <div className="[&>div]:mt-0">
                <InstantSetupHero />
              </div>
            </div>
          </section>
        ) : null}

        {/* Before / after */}
        <section className="border-b border-zinc-200 dark:border-zinc-800">
          <div className={`${CONTAINER} py-20 sm:py-24`}>
            <SectionHeading
              eyebrow="Why switch"
              title="Less chasing. More booked work."
              desc="Most small businesses still book through texts, DMs and a notebook. Here is what changes."
            />
            <div className="mt-12 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <div className="hidden grid-cols-2 bg-zinc-50 text-xs font-bold uppercase tracking-wider text-zinc-500 sm:grid dark:bg-zinc-900">
                <div className="px-6 py-3">Without DoBook</div>
                <div className="border-l border-zinc-200 px-6 py-3 text-rose-600 dark:border-zinc-800">With DoBook</div>
              </div>
              {BEFORE_AFTER.map((row) => (
                <div key={row.before} className="grid border-t border-zinc-200 first:border-t-0 sm:grid-cols-2 sm:first:border-t dark:border-zinc-800">
                  <div className="px-6 pb-1 pt-5 text-zinc-500 line-through decoration-zinc-300 sm:py-5 dark:decoration-zinc-700">{row.before}</div>
                  <div className="flex items-start gap-2.5 px-6 pb-5 pt-1 font-semibold text-zinc-900 sm:border-l sm:border-zinc-200 sm:py-5 dark:text-zinc-100 sm:dark:border-zinc-800">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                    {row.after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section id="features" className="bg-zinc-50 dark:bg-zinc-900/40">
          <div className={`${CONTAINER} py-20 sm:py-24`}>
            <SectionHeading
              eyebrow="Features"
              title="Everything between “are you free?” and “thanks, paid”."
              desc="One place for the booking, the conversation, the reminder and the invoice."
            />

            <div className="mt-12 grid gap-4 md:grid-cols-6">
              {/* Signature card: the trade-specific form */}
              <div className="relative overflow-hidden rounded-3xl bg-zinc-950 p-7 text-white md:col-span-4 md:row-span-2 sm:p-9">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-600/30 blur-3xl"
                />
                <div className="relative">
                  <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-300">Free</span>
                  <h3 className="font-display mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">A booking form that knows your trade</h3>
                  <p className="mt-3 max-w-lg text-zinc-400">
                    Generic schedulers ask for a name and a time. DoBook asks a photo booth for the venue and package, a groomer for the pet details, a venue for guest numbers. Fourteen trades, ready to go, and every field editable.
                  </p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Photo booth', fields: ['Event Location', 'Package Duration', 'Booth Type'] },
                      { label: 'Pet care', fields: ['Service', 'Preferred Date', 'Pet Details'] },
                      { label: 'Venues', fields: ['Booking Type', 'Number of Guests', 'Dietary needs'] },
                    ].map((t) => (
                      <div key={t.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs font-bold text-white">{t.label}</div>
                        <ul className="mt-2 space-y-1.5">
                          {t.fields.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <span className="h-1 w-1 rounded-full bg-rose-400" aria-hidden="true" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className={`group rounded-3xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_18px_40px_-20px_rgba(225,29,72,0.35)] motion-reduce:transform-none dark:border-zinc-800 dark:bg-zinc-900 ${
                      i < 2 ? 'md:col-span-2' : 'md:col-span-3 lg:col-span-2'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-950/50 dark:text-rose-300">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          f.tier === 'Pro'
                            ? 'bg-rose-600 text-white'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {f.tier}
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-lg font-bold text-zinc-950 dark:text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-zinc-200 dark:border-zinc-800">
          <div className={`${CONTAINER} py-20 sm:py-24`}>
            <SectionHeading eyebrow="How it works" title="Live today, not next month." center />
            <ol className="mt-14 grid gap-4 md:grid-cols-3" aria-label="How DoBook works">
              {[
                { title: 'Tell us your trade', desc: 'Pick your industry, or paste your website. Services, booking form and reminder timings are filled in. Change anything that does not fit.' },
                { title: 'Share one link', desc: 'Put it in your Instagram bio, on your website, on your Google profile or at the end of every email.' },
                { title: 'Customers book themselves', desc: 'They choose a time and answer your questions without an account. You get the request, confirmation emails go out automatically.' },
              ].map((s, i) => (
                <li key={s.title} className="relative rounded-3xl border border-zinc-200 p-7 dark:border-zinc-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 font-display text-sm font-extrabold text-white" aria-hidden="true">
                    {i + 1}
                  </div>
                  <h3 className="font-display mt-5 text-xl font-bold text-zinc-950 dark:text-white">{s.title}</h3>
                  <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">{s.desc}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex justify-center">
              <Button asChild className={primaryBtn}>
                <Link href={primaryHref}>
                  {isAuthed ? 'Open dashboard' : 'Create my booking page'}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Industries: internal links help these pages get indexed */}
        <section id="industries" className="bg-zinc-50 dark:bg-zinc-900/40">
          <div className={`${CONTAINER} py-20 sm:py-24`}>
            <SectionHeading
              eyebrow="Industries"
              title="Pick your trade. The setup is already done."
              desc="Each one comes with its own services, booking questions and reminder timings."
            />
            <div className="mt-10 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {INDUSTRIES.map((ind) => (
                <a
                  key={ind.slug}
                  href={`/industries/${ind.slug}`}
                  className="group flex min-h-[52px] items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition-all hover:border-rose-300 hover:shadow-[0_10px_24px_-14px_rgba(225,29,72,0.5)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <span>{ind.label}</span>
                  <ArrowRight className="h-4 w-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-rose-500" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews: real, approved platform reviews only. Hidden when there are none. */}
        {platformReviews.length ? (
          <section id="reviews" className="border-y border-zinc-200 dark:border-zinc-800">
            <div className={`${CONTAINER} py-20 sm:py-24`}>
              <SectionHeading eyebrow="From businesses on DoBook" title="In their words." />
              <div className={`mt-12 grid gap-5 md:grid-cols-2 ${platformReviews.length >= 3 ? 'lg:grid-cols-3' : 'max-w-4xl'}`}>
                {platformReviews.slice(0, 6).map((r) => {
                  const rating = Math.max(0, Math.min(5, Number(r.rating || 0)));
                  return (
                    <figure key={r.id} className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex gap-0.5 text-amber-400" role="img" aria-label={`Rated ${rating} out of 5`}>
                        {Array.from({ length: rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
                        ))}
                      </div>
                      <blockquote className="mt-4 flex-1 whitespace-pre-line text-base leading-7 text-zinc-800 dark:text-zinc-200">
                        “{r.comment}”
                      </blockquote>
                      <figcaption className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {String(r.business_name || 'B').slice(0, 1).toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-zinc-950 dark:text-white">{r.business_name || 'DoBook business'}</span>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* Pricing */}
        <section id="pricing">
          <div className={`${CONTAINER} py-20 sm:py-24`}>
            <SectionHeading
              eyebrow="Pricing"
              title="Start free. Upgrade when it pays for itself."
              desc="One missed appointment usually costs more than a month of Pro."
              center
            />

            <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
              <div className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="font-display text-lg font-bold">Free</h3>
                <p className="mt-1 text-sm text-zinc-500">For getting started and smaller diaries.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-extrabold tracking-tight">$0</span>
                  <span className="text-sm text-zinc-500">forever</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-sm" aria-label="Free plan includes">
                  {FREE_PLAN_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-8 h-12 rounded-xl border-zinc-300 text-base font-semibold dark:border-zinc-700">
                  <Link href={primaryHref}>{isAuthed ? 'Open dashboard' : 'Start free, no card'}</Link>
                </Button>
              </div>

              <div className="relative flex flex-col overflow-hidden rounded-3xl bg-zinc-950 p-8 text-white shadow-[0_30px_60px_-25px_rgba(225,29,72,0.55)] ring-1 ring-rose-500/40">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-600/40 blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">Pro</h3>
                  <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">Best value</span>
                </div>
                <p className="relative mt-1 text-sm text-zinc-400">For a full diary that runs itself.</p>
                <div className="relative mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-extrabold tracking-tight">${PRO_PRICE_AUD}</span>
                  <span className="text-sm text-zinc-400">AUD / month</span>
                </div>
                <ul className="relative mt-6 flex-1 space-y-3 text-sm" aria-label="Pro plan includes">
                  {PRO_PLAN_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="relative mt-8 h-12 rounded-xl bg-rose-600 text-base font-semibold text-white hover:bg-rose-500">
                  <Link href={isAuthed ? '/dashboard' : '/auth?mode=signup&plan=pro'}>{isAuthed ? 'Open dashboard' : 'Go Pro'}</Link>
                </Button>
                <p className="relative mt-3 text-center text-xs text-zinc-500">Cancel any time. No contract.</p>
              </div>
            </div>

            <div className="mx-auto mt-12 max-w-4xl overflow-x-auto rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[30rem] text-sm">
                <caption className="sr-only">Free and Pro plans compared</caption>
                <thead>
                  <tr className="bg-zinc-50 text-left dark:bg-zinc-900">
                    <th scope="col" className="px-5 py-3 font-semibold">Feature</th>
                    <th scope="col" className="w-28 px-5 py-3 text-center font-semibold">Free</th>
                    <th scope="col" className="w-28 px-5 py-3 text-center font-semibold text-rose-600">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_COMPARISON.map(({ feature, free, pro }) => (
                    <tr key={feature} className="border-t border-zinc-200 dark:border-zinc-800">
                      <th scope="row" className="px-5 py-3 text-left font-normal text-zinc-700 dark:text-zinc-300">{feature}</th>
                      {[free, pro].map((v, i) => (
                        <td key={i} className="px-5 py-3 text-center text-zinc-700 dark:text-zinc-300">
                          {v === true ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Included" />
                          ) : v === false ? (
                            <span className="text-zinc-300 dark:text-zinc-600" aria-label="Not included">–</span>
                          ) : (
                            v
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className={`${CONTAINER} grid gap-10 py-20 sm:py-24 lg:grid-cols-12`}>
            <div className="lg:col-span-4">
              <SectionHeading eyebrow="FAQ" title="Questions, answered." />
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Something else? Email{' '}
                <a className="font-semibold text-rose-600 underline-offset-4 hover:underline" href="mailto:support@do-book.com">
                  support@do-book.com
                </a>
                .
              </p>
            </div>
            <div className="space-y-3 lg:col-span-8">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-zinc-950 dark:text-white [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-transform group-open:rotate-45 dark:border-zinc-700" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 leading-7 text-zinc-600 dark:text-zinc-400">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-hidden bg-rose-600">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: 'radial-gradient(700px circle at 80% 0%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(500px circle at 0% 100%, rgba(24,24,27,0.25), transparent 60%)' }}
          />
          <div className={`${CONTAINER} py-20 text-center sm:py-24`}>
            <h2 className="font-display mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Your next booking could make itself.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-rose-100">
              Set up your page in about 10 minutes. Free for your first 50 bookings every month.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild data-testid="cta-get-started-btn" className="h-12 rounded-xl bg-white px-8 text-base font-semibold text-rose-700 shadow-lg hover:bg-rose-50">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-xl border-white/40 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white">
                <a href="#pricing">Compare plans</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-950">
        <div className={`${CONTAINER} py-14`}>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Link href="/" className="inline-flex rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300" aria-label="DoBook home">
                <BrandLogo className="h-11" />
              </Link>
              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Online booking for service businesses: booking pages built for your trade, enquiries and quotes, reminders and invoices in one place.
              </p>
              <Link
                href={customerHref}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-rose-300 hover:text-rose-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Looking to book a local business?
              </Link>
            </div>

            <div className="grid gap-8 sm:grid-cols-3 lg:col-span-7">
              <div>
                <div className="text-sm font-bold text-zinc-950 dark:text-white">Product</div>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <li><a className="hover:text-zinc-950 dark:hover:text-white" href="#features">Features</a></li>
                  <li><a className="hover:text-zinc-950 dark:hover:text-white" href="#pricing">Pricing</a></li>
                  <li><Link className="hover:text-zinc-950 dark:hover:text-white" href={customerHref}>Find a local business</Link></li>
                  <li><Link className="hover:text-zinc-950 dark:hover:text-white" href="/login">Log in</Link></li>
                </ul>
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-950 dark:text-white">Popular trades</div>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {INDUSTRIES.slice(0, 5).map((ind) => (
                    <li key={ind.slug}>
                      <a className="hover:text-zinc-950 dark:hover:text-white" href={`/industries/${ind.slug}`}>{ind.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-950 dark:text-white">Company</div>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <li><a className="hover:text-zinc-950 dark:hover:text-white" href="mailto:support@do-book.com">Contact</a></li>
                  <li><a className="hover:text-zinc-950 dark:hover:text-white" href="/privacy">Privacy</a></li>
                  <li><a className="hover:text-zinc-950 dark:hover:text-white" href="/terms">Terms</a></li>
                  <li><a className="hover:text-zinc-950 dark:hover:text-white" href="/policies/cancellation">Cancellation policy</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div>© {new Date().getFullYear()} DoBook. All rights reserved.</div>
            <div>
              Website by{' '}
              <a href="https://www.tradewebco.co.uk" target="_blank" rel="noopener" className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300">
                Trade Web Co
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
