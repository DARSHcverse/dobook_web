// Client retention insights for the CRM: how often a regular comes back and
// whether they are due (or overdue) for their next visit. Pure, no imports.
//
// A "visit" is a non-cancelled booking on or before today. The usual gap is
// the median of the gaps between visit dates (median, so one long holiday
// does not distort it). It needs at least two visits.

const DAY = 864e5;

function toTs(ymd) {
  const t = Date.parse(`${String(ymd || "").slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

function ymd(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// bookings: [{ booking_date, status }], today: "YYYY-MM-DD"
export function clientRetention(bookings, today) {
  const todayTs = toTs(today);
  const live = (bookings || []).filter((b) => String(b?.status || "confirmed").toLowerCase() !== "cancelled");
  const cancelled = (bookings || []).length - live.length;
  const dates = live.map((b) => toTs(b.booking_date)).filter((t) => t !== null);
  const past = [...new Set(dates.filter((t) => t <= todayTs))].sort((a, b) => a - b);
  const future = dates.filter((t) => t > todayTs).sort((a, b) => a - b);

  const gaps = past.slice(1).map((t, i) => Math.round((t - past[i]) / DAY)).filter((g) => g > 0);
  const usualGap = gaps.length ? Math.round(median(gaps)) : null;
  const lastVisit = past.length ? past[past.length - 1] : null;
  const nextDue = usualGap && lastVisit ? lastVisit + usualGap * DAY : null;

  let status = "new"; // fewer than two visits: no rhythm yet
  if (future.length) status = "booked";
  else if (nextDue !== null) {
    const daysUntil = Math.round((nextDue - todayTs) / DAY);
    // Overdue once a quarter of their usual gap (min 3 days) has passed.
    if (daysUntil < -Math.max(3, Math.round(usualGap * 0.25))) status = "overdue";
    else if (daysUntil <= 7) status = "due";
    else status = "ok";
  }

  return {
    visits: past.length,
    cancelled,
    usual_gap_days: usualGap,
    last_visit_date: lastVisit ? ymd(lastVisit) : null,
    next_due_date: nextDue ? ymd(nextDue) : null,
    upcoming_date: future.length ? ymd(future[0]) : null,
    rebook_status: status,
  };
}
