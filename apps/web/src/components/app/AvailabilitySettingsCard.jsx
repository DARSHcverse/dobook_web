'use client';

// Owner-facing editor for opening hours and booking rules (lib/availability.js).
import { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { CalendarX2, Plus, RotateCcw, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API } from '@/lib/appShared';
import { defaultAvailabilityForType, normalizeAvailability } from '@/lib/availability';
import { inferBookingTypeKey } from '@/lib/bookingFieldsByType';

const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const INTERVALS = [10, 15, 20, 30, 45, 60, 90, 120];

function NumberField({ id, label, hint, value, onChange, min = 0, max = 9999, suffix }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="bg-zinc-50"
        />
        {suffix ? <span className="shrink-0 text-sm text-zinc-500">{suffix}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function AvailabilitySettingsCard({ business, onUpdate }) {
  const typeKey = inferBookingTypeKey({ businessType: business?.business_type, industry: business?.industry });
  const services = useMemo(
    () => (Array.isArray(business?.booth_types) ? business.booth_types.map((s) => String(s || '').trim()).filter(Boolean) : []),
    [business?.booth_types],
  );
  const hasSaved = business?.availability && typeof business.availability === 'object';

  const [a, setA] = useState(() =>
    hasSaved
      ? normalizeAvailability(business.availability)
      : { ...defaultAvailabilityForType(typeKey), enabled: false, buffer_mins: Number(business?.buffer_mins) || 0, min_notice_hrs: Number(business?.advance_booking_hrs) || 0 },
  );
  const [closedInput, setClosedInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);

  const set = (patch) => setA((prev) => ({ ...prev, ...patch }));
  const setDay = (day, ranges) => setA((prev) => ({ ...prev, hours: { ...prev.hours, [day]: ranges } }));
  const isDay = a.mode === 'day';

  async function save() {
    setSaving(true);
    try {
      const payload = normalizeAvailability(a);
      const res = await axios.put(`${API}/business/profile`, { availability: payload });
      if (!res?.data || !('availability' in res.data)) {
        setNeedsMigration(true);
        toast.error('Saved nothing: the database needs the availability update first.');
        return;
      }
      setA(normalizeAvailability(res.data.availability));
      onUpdate?.(res.data);
      toast.success(payload.enabled ? 'Availability saved. Customers now only see free times.' : 'Availability saved.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not save availability');
    } finally {
      setSaving(false);
    }
  }

  function addClosedDate() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(closedInput)) return;
    set({ closed_dates: [...new Set([...(a.closed_dates || []), closedInput])].sort() });
    setClosedInput('');
  }

  return (
    <Card className="mb-6 rounded-xl border border-zinc-200 bg-white shadow-sm" data-testid="availability-settings">
      <CardHeader>
        <CardTitle style={{ fontFamily: 'Manrope' }}>Availability</CardTitle>
        <CardDescription>
          Set your opening hours and booking rules. Customers will only be offered times that are genuinely free, and two people can never book the same slot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {needsMigration ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            The database has not been updated for availability yet. Apply migration <code>20261122120000_business_availability.sql</code> in Supabase, then save again.
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 p-4">
          <div>
            <div className="font-semibold">Only offer free times</div>
            <p className="mt-0.5 text-sm text-zinc-500">
              {a.enabled ? 'On: your booking page shows a calendar of open dates and times.' : 'Off: customers type any date and time, and you confirm manually.'}
            </p>
          </div>
          <Switch aria-label="Only offer free times" checked={a.enabled} onCheckedChange={(v) => set({ enabled: Boolean(v) })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="How customers book">
          {[
            { id: 'slots', title: 'Time slots', desc: 'Customers pick a start time. Best for appointments: salons, clinics, coaching.' },
            { id: 'day', title: 'Whole days', desc: 'Customers pick a date. Best for events and jobs: photo booths, trades, cleaning.' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={a.mode === m.id}
              onClick={() => set({ mode: m.id })}
              className={`rounded-xl border p-4 text-left transition-colors ${a.mode === m.id ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-200' : 'border-zinc-200 hover:border-zinc-300'}`}
            >
              <div className="font-semibold">{m.title}</div>
              <p className="mt-1 text-sm text-zinc-600">{m.desc}</p>
            </button>
          ))}
        </div>

        <section>
          <h3 className="font-semibold">{isDay ? 'Days you take bookings' : 'Opening hours'}</h3>
          <div className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
            {ORDER.map((day) => {
              const ranges = a.hours?.[day] || [];
              const open = ranges.length > 0;
              return (
                <div key={day} className={`flex gap-3 p-3 ${isDay ? "flex-row items-center justify-between sm:justify-start" : "flex-col sm:flex-row sm:items-center"}`}>
                  <div className="flex w-40 items-center gap-3">
                    <Switch
                      aria-label={`Open on ${DAY_LABELS[day]}`}
                      checked={open}
                      onCheckedChange={(v) => setDay(day, v ? [['09:00', '17:00']] : [])}
                    />
                    <span className={`text-sm font-medium ${open ? 'text-zinc-900' : 'text-zinc-400'}`}>{DAY_LABELS[day]}</span>
                  </div>
                  {open && !isDay ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {ranges.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            type="time"
                            aria-label={`${DAY_LABELS[day]} opens`}
                            value={r[0]}
                            onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))}
                            className="h-9 w-[7.5rem] bg-zinc-50"
                          />
                          <span className="text-sm text-zinc-400">to</span>
                          <Input
                            type="time"
                            aria-label={`${DAY_LABELS[day]} closes`}
                            value={r[1]}
                            onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? [x[0], e.target.value] : x)))}
                            className="h-9 w-[7.5rem] bg-zinc-50"
                          />
                          {i > 0 ? (
                            <button type="button" aria-label="Remove time range" className="p-1 text-zinc-400 hover:text-rose-600" onClick={() => setDay(day, ranges.filter((_, j) => j !== i))}>
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {ranges.length < 3 ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                          onClick={() => setDay(day, [...ranges, ['13:00', '17:00']])}
                        >
                          <Plus className="h-3.5 w-3.5" /> Split shift
                        </button>
                      ) : null}
                    </div>
                  ) : open ? (
                    <span className="text-sm text-zinc-500">Taking bookings</span>
                  ) : (
                    <span className="text-sm text-zinc-400">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          {!isDay ? (
            <>
              <div>
                <Label>Start times every</Label>
                <Select value={String(a.slot_interval_mins)} onValueChange={(v) => set({ slot_interval_mins: Number(v) })}>
                  <SelectTrigger className="mt-2 bg-zinc-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((n) => <SelectItem key={n} value={String(n)}>{n} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <NumberField id="avail-duration" label="Default appointment length" value={a.default_duration_mins} onChange={(v) => set({ default_duration_mins: v })} min={5} max={1440} suffix="min" />
              <NumberField id="avail-buffer" label="Break after each booking" hint="Clean-up or travel time before the next customer." value={a.buffer_mins} onChange={(v) => set({ buffer_mins: v })} max={240} suffix="min" />
            </>
          ) : null}
          <NumberField
            id="avail-capacity"
            label={isDay ? 'Bookings per day' : 'Customers at the same time'}
            hint={isDay ? 'How many events or jobs you can take on one day.' : 'Chairs, rooms or staff available at once.'}
            value={a.capacity}
            onChange={(v) => set({ capacity: v })}
            min={1}
            max={200}
          />
          <NumberField id="avail-notice" label="Minimum notice" hint="How far ahead customers must book." value={a.min_notice_hrs} onChange={(v) => set({ min_notice_hrs: v })} max={1440} suffix="hours" />
          <NumberField id="avail-window" label="Booking window" hint="How far into the future customers can book." value={a.max_advance_days} onChange={(v) => set({ max_advance_days: v })} min={1} max={730} suffix="days" />
        </section>

        {!isDay && services.length ? (
          <section>
            <h3 className="font-semibold">Length per service</h3>
            <p className="mt-0.5 text-sm text-zinc-500">Leave blank to use the default length.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {services.map((svc) => (
                <div key={svc} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2">
                  <span className="truncate text-sm font-medium">{svc}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label={`${svc} length in minutes`}
                      min={5}
                      max={1440}
                      placeholder={String(a.default_duration_mins)}
                      value={a.service_durations?.[svc] ?? ''}
                      onChange={(e) => {
                        const next = { ...(a.service_durations || {}) };
                        if (e.target.value === '') delete next[svc];
                        else next[svc] = Number(e.target.value);
                        set({ service_durations: next });
                      }}
                      className="h-9 w-20 bg-zinc-50"
                    />
                    <span className="text-xs text-zinc-500">min</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="flex items-center gap-2 font-semibold"><CalendarX2 className="h-4 w-4 text-zinc-500" /> Closed dates</h3>
          <p className="mt-0.5 text-sm text-zinc-500">Holidays and days off. Nobody can book these.</p>
          <div className="mt-3 flex gap-2">
            <Input type="date" aria-label="Add a closed date" value={closedInput} onChange={(e) => setClosedInput(e.target.value)} className="w-44 bg-zinc-50" />
            <Button type="button" variant="outline" onClick={addClosedDate} disabled={!closedInput}>Add</Button>
          </div>
          {a.closed_dates?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.closed_dates.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-1 text-sm">
                  {new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  <button type="button" aria-label={`Remove ${d}`} className="rounded-full p-1 text-zinc-400 hover:text-rose-600" onClick={() => set({ closed_dates: a.closed_dates.filter((x) => x !== d) })}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-zinc-600"
            onClick={() => setA({ ...defaultAvailabilityForType(typeKey), enabled: a.enabled })}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset to recommended hours
          </Button>
          <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save availability'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

