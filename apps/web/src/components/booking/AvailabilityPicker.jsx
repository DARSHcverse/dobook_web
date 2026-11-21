'use client';

// Customer-facing date + time picker that only offers genuinely free times.
// Data comes from /api/public/availability (times only, never who booked).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API } from '@/lib/appShared';

const PAGE_DAYS = 14;

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayParts(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
    day: d.getUTCDate(),
    month: d.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }),
    long: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  };
}

export function formatTime12h(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function groupSlots(slots) {
  const groups = [
    { label: 'Morning', items: [] },
    { label: 'Afternoon', items: [] },
    { label: 'Evening', items: [] },
  ];
  for (const s of slots) {
    const h = Number(String(s).slice(0, 2));
    groups[h < 12 ? 0 : h < 17 ? 1 : 2].items.push(s);
  }
  return groups.filter((g) => g.items.length);
}

export default function AvailabilityPicker({ businessId, service, mode, date, time, onChange }) {
  const [from, setFrom] = useState(null);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const stripRef = useRef(null);

  // Keep the chosen day visible in the horizontal strip (scrolls only the
  // strip; scrollIntoView could also jump the page).
  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector('[aria-checked="true"]');
    if (!strip || !chip) return;
    // The strip is `relative`, so it is the chip's offsetParent.
    const left = chip.offsetLeft;
    if (left < strip.scrollLeft || left + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left - 8), behavior: 'smooth' });
    }
  }, [date, state.data]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const qs = new URLSearchParams({ business_id: businessId, days: String(PAGE_DAYS) });
      if (from) qs.set('from', from);
      if (service) qs.set('service', service);
      const res = await fetch(`${API}/public/availability?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Could not load availability');
      setState({ loading: false, error: '', data });
    } catch (e) {
      setState({ loading: false, error: e?.message || 'Could not load availability', data: null });
    }
  }, [businessId, from, service]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => state.data?.days || [], [state.data]);
  const today = state.data?.today || null;
  const selectedDay = days.find((d) => d.date === date);

  // Pick the first open day automatically so the customer sees times at once,
  // and drop a chosen time that a service change has made unavailable.
  useEffect(() => {
    if (!days.length) return;
    if (!date || !days.some((d) => d.date === date)) {
      const first = days.find((d) => d.available);
      if (first && (!date || date < days[0].date || date > days[days.length - 1].date)) {
        onChange({ date: first.date, time: '' });
      }
      return;
    }
    if (mode === 'slots' && time && selectedDay && !selectedDay.slots?.includes(time)) {
      onChange({ date, time: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const windowStart = days[0]?.date || from || today;
  const canGoBack = Boolean(today && windowStart && windowStart > today);
  const maxDate = today && state.data?.max_advance_days ? addDays(today, state.data.max_advance_days) : null;
  const canGoForward = Boolean(windowStart && (!maxDate || addDays(windowStart, PAGE_DAYS) <= maxDate));
  const anyOpen = days.some((d) => d.available);

  return (
    <div className="space-y-4" data-testid="availability-picker">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-900">{mode === 'day' ? 'Choose a date' : 'Choose a date and time'}</div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Earlier dates"
            disabled={!canGoBack || state.loading}
            onClick={() => setFrom(addDays(windowStart, -PAGE_DAYS) < today ? today : addDays(windowStart, -PAGE_DAYS))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Later dates"
            disabled={!canGoForward || state.loading}
            onClick={() => setFrom(addDays(windowStart, PAGE_DAYS))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {state.error}.{' '}
          <button type="button" className="font-semibold underline" onClick={load}>
            Try again
          </button>
        </div>
      ) : null}

      <div ref={stripRef} className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="radiogroup" aria-label="Available dates">
        {state.loading && !days.length
          ? Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-[72px] w-[60px] shrink-0 animate-pulse rounded-2xl bg-zinc-100" />)
          : days.map((d) => {
              const p = dayParts(d.date);
              const active = d.date === date;
              return (
                <button
                  key={d.date}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${p.long}${d.available ? '' : ', unavailable'}`}
                  disabled={!d.available}
                  onClick={() => onChange({ date: d.date, time: '' })}
                  className={cn(
                    'flex h-[72px] w-[60px] shrink-0 flex-col items-center justify-center rounded-2xl border text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300',
                    active
                      ? 'border-rose-600 bg-rose-600 text-white shadow-[0_8px_20px_-10px_rgba(225,29,72,0.8)]'
                      : d.available
                        ? 'border-zinc-200 bg-white text-zinc-900 hover:border-rose-300'
                        : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 line-through',
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase">{p.weekday}</span>
                  <span className="text-lg font-bold leading-6">{p.day}</span>
                  <span className="text-[10px]">{p.month}</span>
                </button>
              );
            })}
      </div>

      {!state.loading && days.length && !anyOpen ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          No openings in these two weeks. Try later dates, or contact the business directly.
        </p>
      ) : null}

      {mode === 'slots' && selectedDay ? (
        <div className="space-y-3" aria-live="polite">
          {state.loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking times…
            </div>
          ) : selectedDay.slots?.length ? (
            groupSlots(selectedDay.slots).map((g) => (
              <div key={g.label}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{g.label}</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={`${g.label} times`}>
                  {g.items.map((s) => {
                    const active = s === time;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange({ date, time: s })}
                        className={cn(
                          'h-11 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300',
                          active ? 'border-rose-600 bg-rose-600 text-white' : 'border-zinc-200 bg-white text-zinc-800 hover:border-rose-300',
                        )}
                      >
                        {formatTime12h(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No times left on this day. Please pick another date.</p>
          )}
        </div>
      ) : null}

      {date ? (
        <p className="text-xs text-zinc-500">
          {mode === 'day'
            ? `${dayParts(date).long} is available.`
            : time
              ? `Selected: ${dayParts(date).long} at ${formatTime12h(time)}`
              : 'Pick a time to continue.'}
        </p>
      ) : null}
    </div>
  );
}
