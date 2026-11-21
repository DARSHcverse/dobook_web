// Availability engine: business hours, time slots and double-booking checks.
//
// Pure functions with no imports, so they run identically in API routes, the
// browser and `node --test` (src/lib/__tests__/availability.test.mjs).
//
// Bookings store booking_date (YYYY-MM-DD) and booking_time (HH:MM) as the
// business's local wall-clock time, so all slot maths is done in local
// minutes-since-midnight. Only "now" needs converting into the business's
// timezone (for minimum notice), which Intl does without a dependency.
//
// Two modes:
//   slots - appointment trades: pick a start time; capacity = how many
//           bookings may overlap (chairs, rooms, staff).
//   day   - event/job trades: pick a date; capacity = bookings per day.

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const DAY_MODE_TYPES = new Set(["photobooth", "events_photography", "home_services_trades", "cleaning_services"]);

function hours(open, close, days) {
  const out = {};
  for (const d of WEEKDAYS) out[d] = days.includes(d) ? [[open, close]] : [];
  return out;
}

const WEEKDAYS_ONLY = ["mon", "tue", "wed", "thu", "fri"];

// Sensible opening hours per trade, used to pre-fill new businesses.
const TYPE_DEFAULTS = {
  salon_barbershop: { hours: hours("09:00", "18:00", ["tue", "wed", "thu", "fri", "sat"]), slot_interval_mins: 15, default_duration_mins: 30 },
  beauty_spa: { hours: hours("09:00", "18:00", ["tue", "wed", "thu", "fri", "sat"]), slot_interval_mins: 15, default_duration_mins: 60 },
  medical_wellness: { hours: hours("08:30", "17:30", WEEKDAYS_ONLY), slot_interval_mins: 15, default_duration_mins: 30 },
  consultant: { hours: hours("09:00", "17:00", WEEKDAYS_ONLY), slot_interval_mins: 30, default_duration_mins: 60 },
  legal_advisory: { hours: hours("09:00", "17:00", WEEKDAYS_ONLY), slot_interval_mins: 30, default_duration_mins: 60 },
  tutoring_education: { hours: hours("15:00", "20:00", WEEKDAYS_ONLY), slot_interval_mins: 30, default_duration_mins: 60 },
  fitness_training: { hours: hours("06:00", "20:00", [...WEEKDAYS_ONLY, "sat"]), slot_interval_mins: 30, default_duration_mins: 60 },
  pet_services: { hours: hours("08:00", "17:00", [...WEEKDAYS_ONLY, "sat"]), slot_interval_mins: 30, default_duration_mins: 90 },
  automotive: { hours: hours("07:30", "17:00", WEEKDAYS_ONLY), slot_interval_mins: 30, default_duration_mins: 120 },
  restaurant_venue: { hours: hours("11:30", "22:00", ["tue", "wed", "thu", "fri", "sat", "sun"]), slot_interval_mins: 30, default_duration_mins: 120, capacity: 10 },
  photobooth: { hours: hours("08:00", "23:59", WEEKDAYS), capacity: 1 },
  events_photography: { hours: hours("07:00", "23:59", WEEKDAYS), capacity: 1 },
  home_services_trades: { hours: hours("07:00", "17:00", WEEKDAYS_ONLY), capacity: 4 },
  cleaning_services: { hours: hours("07:00", "17:00", [...WEEKDAYS_ONLY, "sat"]), capacity: 3 },
};

export function defaultAvailabilityForType(businessType) {
  const t = String(businessType || "").trim();
  const base = TYPE_DEFAULTS[t] || TYPE_DEFAULTS.consultant;
  return normalizeAvailability({ enabled: true, mode: DAY_MODE_TYPES.has(t) ? "day" : "slots", ...base });
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toMinutes(hhmm) {
  const m = TIME_RE.exec(String(hhmm || "").trim().slice(0, 5));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function fromMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clampInt(v, min, max, fallback) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// Validates and fills an availability object from untrusted input (the
// dashboard form or the DB). Invalid ranges are dropped, never thrown on.
export function normalizeAvailability(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const hoursOut = {};
  for (const d of WEEKDAYS) {
    const ranges = Array.isArray(src.hours?.[d]) ? src.hours[d] : [];
    hoursOut[d] = ranges
      .map((r) => (Array.isArray(r) ? [toMinutes(r[0]), toMinutes(r[1])] : [null, null]))
      .filter(([a, b]) => a !== null && b !== null && b > a)
      .sort((x, y) => x[0] - y[0])
      .slice(0, 4)
      .map(([a, b]) => [fromMinutes(a), fromMinutes(b)]);
  }
  const durations = {};
  if (src.service_durations && typeof src.service_durations === "object") {
    for (const [name, mins] of Object.entries(src.service_durations).slice(0, 60)) {
      const key = String(name || "").trim().slice(0, 120);
      const n = clampInt(mins, 5, 24 * 60, null);
      if (key && n) durations[key] = n;
    }
  }
  const closed = Array.isArray(src.closed_dates)
    ? [...new Set(src.closed_dates.map((d) => String(d || "").trim()).filter((d) => DATE_RE.test(d)))].sort().slice(-200)
    : [];
  return {
    enabled: src.enabled === true,
    mode: src.mode === "day" ? "day" : "slots",
    hours: hoursOut,
    slot_interval_mins: [5, 10, 15, 20, 30, 45, 60, 90, 120].includes(Number(src.slot_interval_mins)) ? Number(src.slot_interval_mins) : 30,
    default_duration_mins: clampInt(src.default_duration_mins, 5, 24 * 60, 60),
    service_durations: durations,
    buffer_mins: clampInt(src.buffer_mins, 0, 240, 0),
    min_notice_hrs: clampInt(src.min_notice_hrs, 0, 24 * 60, 0),
    max_advance_days: clampInt(src.max_advance_days, 1, 730, 90),
    capacity: clampInt(src.capacity, 1, 200, 1),
    closed_dates: closed,
  };
}

// Current date and minutes-since-midnight in the business's timezone.
export function localNow(timeZone, now = new Date()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return localNow("UTC", now);
  }
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
}

export function weekdayOf(dateStr) {
  return WEEKDAYS[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

export function durationFor(avail, serviceName) {
  const key = String(serviceName || "").trim();
  return (key && avail.service_durations?.[key]) || avail.default_duration_mins;
}

// A booking blocks time if it is a real booking that is not cancelled.
// Enquiries are requests, not commitments, so they never block.
function blockingBookings(bookings, date) {
  return (bookings || []).filter(
    (b) =>
      String(b?.booking_date || "").slice(0, 10) === date &&
      String(b?.status || "confirmed").toLowerCase() !== "cancelled" &&
      b?.is_enquiry !== true,
  );
}

// Earliest bookable moment, as {date, minutes} in local time.
function earliest(avail, nowLocal) {
  const total = nowLocal.minutes + avail.min_notice_hrs * 60;
  return { date: addDays(nowLocal.date, Math.floor(total / 1440)), minutes: total % 1440 };
}

function dateBookable(avail, date, nowLocal) {
  if (!DATE_RE.test(String(date || ""))) return false;
  if (avail.closed_dates.includes(date)) return false;
  if (!avail.hours[weekdayOf(date)]?.length) return false;
  const e = earliest(avail, nowLocal);
  if (date < e.date) return false;
  if (daysBetween(nowLocal.date, date) > avail.max_advance_days) return false;
  return true;
}

// Slots mode: every start time on `date` that fits the opening hours, respects
// notice and leaves fewer than `capacity` overlapping bookings (with buffer).
export function computeDaySlots({ avail, date, bookings, durationMins, nowLocal }) {
  if (!dateBookable(avail, date, nowLocal)) return [];
  const dur = clampInt(durationMins, 5, 24 * 60, avail.default_duration_mins);
  const buf = avail.buffer_mins;
  const e = earliest(avail, nowLocal);
  const minStart = date === e.date ? e.minutes : 0;
  const taken = blockingBookings(bookings, date)
    .map((b) => {
      const s = toMinutes(b.booking_time);
      if (s === null) return null;
      const d = clampInt(b.duration_minutes, 5, 24 * 60, avail.default_duration_mins);
      return [s, s + d + buf];
    })
    .filter(Boolean);

  const slots = [];
  for (const [open, close] of avail.hours[weekdayOf(date)]) {
    const o = toMinutes(open);
    const c = toMinutes(close);
    for (let s = o; s + dur <= c; s += avail.slot_interval_mins) {
      if (s < minStart) continue;
      const end = s + dur + buf;
      const overlapping = taken.filter(([ts, te]) => s < te && ts < end).length;
      if (overlapping < avail.capacity) slots.push(fromMinutes(s));
    }
  }
  return [...new Set(slots)];
}

// Day mode: is there room left on `date`, and how much.
export function dayAvailability({ avail, date, bookings, nowLocal }) {
  if (!dateBookable(avail, date, nowLocal)) return { available: false, remaining: 0 };
  const remaining = Math.max(0, avail.capacity - blockingBookings(bookings, date).length);
  return { available: remaining > 0, remaining };
}

// Server-side guard used when a booking is submitted.
export function checkRequestedSlot({ avail, date, time, serviceName, bookings, nowLocal }) {
  if (!avail?.enabled) return { ok: true };
  if (avail.mode === "day") {
    return dayAvailability({ avail, date, bookings, nowLocal }).available
      ? { ok: true }
      : { ok: false, reason: "That date is fully booked or unavailable. Please choose another date." };
  }
  const fail = { ok: false, reason: "Sorry, that time was just taken or is outside opening hours. Please pick another time." };
  const t = toMinutes(time);
  if (t === null) return fail;
  const slots = computeDaySlots({ avail, date, bookings, durationMins: durationFor(avail, serviceName), nowLocal });
  return slots.includes(fromMinutes(t)) ? { ok: true } : fail;
}
