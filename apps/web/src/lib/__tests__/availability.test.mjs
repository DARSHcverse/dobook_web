import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkRequestedSlot,
  computeDaySlots,
  dayAvailability,
  defaultAvailabilityForType,
  localNow,
  normalizeAvailability,
} from "../availability.js";

// 2026-12-01 is a Tuesday.
const TUE = "2026-12-01";
const NOW = { date: "2026-11-30", minutes: 9 * 60 }; // Monday 09:00 local

const base = (over = {}) =>
  normalizeAvailability({
    enabled: true,
    mode: "slots",
    hours: { tue: [["09:00", "12:00"]] },
    slot_interval_mins: 60,
    default_duration_mins: 60,
    ...over,
  });

const booking = (time, over = {}) => ({ booking_date: TUE, booking_time: time, duration_minutes: 60, status: "confirmed", ...over });

test("slots fill opening hours and stop when the service would overrun closing", () => {
  assert.deepEqual(computeDaySlots({ avail: base(), date: TUE, bookings: [], durationMins: 60, nowLocal: NOW }), ["09:00", "10:00", "11:00"]);
  assert.deepEqual(computeDaySlots({ avail: base(), date: TUE, bookings: [], durationMins: 120, nowLocal: NOW }), ["09:00", "10:00"]);
});

test("an existing booking blocks its slot (no double booking)", () => {
  const slots = computeDaySlots({ avail: base(), date: TUE, bookings: [booking("10:00")], durationMins: 60, nowLocal: NOW });
  assert.deepEqual(slots, ["09:00", "11:00"]);
});

test("a longer booking blocks every slot it overlaps", () => {
  const slots = computeDaySlots({ avail: base(), date: TUE, bookings: [booking("09:00", { duration_minutes: 120 })], durationMins: 60, nowLocal: NOW });
  assert.deepEqual(slots, ["11:00"]);
});

test("capacity allows that many overlapping bookings", () => {
  const avail = base({ capacity: 2 });
  assert.deepEqual(computeDaySlots({ avail, date: TUE, bookings: [booking("10:00")], durationMins: 60, nowLocal: NOW }), ["09:00", "10:00", "11:00"]);
  assert.deepEqual(computeDaySlots({ avail, date: TUE, bookings: [booking("10:00"), booking("10:00")], durationMins: 60, nowLocal: NOW }), ["09:00", "11:00"]);
});

test("buffer time after a booking keeps the next slot free", () => {
  const avail = base({ slot_interval_mins: 30, buffer_mins: 30 });
  const slots = computeDaySlots({ avail, date: TUE, bookings: [booking("09:00")], durationMins: 60, nowLocal: NOW });
  // 09:00 booking + 60 min + 30 buffer => busy until 10:30. 11:00 still fits:
  // the service ends at the 12:00 close and its buffer may run past closing.
  assert.deepEqual(slots, ["10:30", "11:00"]);
});

test("cancelled bookings and enquiries never block", () => {
  const bookings = [booking("09:00", { status: "cancelled" }), booking("10:00", { is_enquiry: true })];
  assert.deepEqual(computeDaySlots({ avail: base(), date: TUE, bookings, durationMins: 60, nowLocal: NOW }), ["09:00", "10:00", "11:00"]);
});

test("minimum notice hides slots that are too soon", () => {
  const avail = base({ min_notice_hrs: 25 }); // Monday 09:00 + 25h => Tuesday 10:00
  assert.deepEqual(computeDaySlots({ avail, date: TUE, bookings: [], durationMins: 60, nowLocal: NOW }), ["10:00", "11:00"]);
});

test("closed weekdays, closed dates, past dates and the advance window are unavailable", () => {
  assert.deepEqual(computeDaySlots({ avail: base(), date: "2026-12-02", bookings: [], durationMins: 60, nowLocal: NOW }), [], "Wednesday closed");
  assert.deepEqual(computeDaySlots({ avail: base({ closed_dates: [TUE] }), date: TUE, bookings: [], durationMins: 60, nowLocal: NOW }), [], "holiday");
  assert.deepEqual(computeDaySlots({ avail: base(), date: "2026-11-24", bookings: [], durationMins: 60, nowLocal: NOW }), [], "past");
  assert.deepEqual(computeDaySlots({ avail: base({ max_advance_days: 7 }), date: "2026-12-08", bookings: [], durationMins: 60, nowLocal: NOW }), [], "8 days ahead > 7-day window");
  assert.equal(computeDaySlots({ avail: base({ max_advance_days: 8 }), date: "2026-12-08", bookings: [], durationMins: 60, nowLocal: NOW }).length, 3, "inside the window");
});

test("day mode counts bookings per day against capacity", () => {
  const avail = base({ mode: "day", capacity: 2 });
  assert.deepEqual(dayAvailability({ avail, date: TUE, bookings: [booking("18:00")], nowLocal: NOW }), { available: true, remaining: 1 });
  assert.deepEqual(dayAvailability({ avail, date: TUE, bookings: [booking("18:00"), booking("19:00")], nowLocal: NOW }), { available: false, remaining: 0 });
});

test("server check rejects taken or off-grid times and accepts free ones", () => {
  const avail = base();
  assert.equal(checkRequestedSlot({ avail, date: TUE, time: "10:00", bookings: [], nowLocal: NOW }).ok, true);
  assert.equal(checkRequestedSlot({ avail, date: TUE, time: "10:00", bookings: [booking("10:00")], nowLocal: NOW }).ok, false);
  assert.equal(checkRequestedSlot({ avail, date: TUE, time: "10:17", bookings: [], nowLocal: NOW }).ok, false);
  assert.equal(checkRequestedSlot({ avail, date: TUE, time: "garbage", bookings: [], nowLocal: NOW }).ok, false);
  assert.equal(checkRequestedSlot({ avail: { ...avail, enabled: false }, date: TUE, time: "03:00", bookings: [], nowLocal: NOW }).ok, true, "disabled = no enforcement");
});

test("service durations override the default", () => {
  const avail = base({ service_durations: { "Skin fade": 120 } });
  assert.equal(checkRequestedSlot({ avail, date: TUE, time: "11:00", serviceName: "Skin fade", bookings: [], nowLocal: NOW }).ok, false);
  assert.equal(checkRequestedSlot({ avail, date: TUE, time: "11:00", serviceName: "Beard trim", bookings: [], nowLocal: NOW }).ok, true);
});

test("normalize drops invalid input instead of throwing", () => {
  const a = normalizeAvailability({ hours: { mon: [["17:00", "09:00"], ["25:00", "26:00"], ["09:00", "12:00"]] }, capacity: -5, slot_interval_mins: 7, closed_dates: ["nope", "2026-12-25"] });
  assert.deepEqual(a.hours.mon, [["09:00", "12:00"]]);
  assert.equal(a.capacity, 1);
  assert.equal(a.slot_interval_mins, 30);
  assert.deepEqual(a.closed_dates, ["2026-12-25"]);
  assert.equal(a.enabled, false, "never enabled unless explicitly true");
  assert.doesNotThrow(() => normalizeAvailability(null));
});

test("every trade gets sensible defaults", () => {
  assert.equal(defaultAvailabilityForType("photobooth").mode, "day");
  assert.equal(defaultAvailabilityForType("salon_barbershop").mode, "slots");
  assert.equal(defaultAvailabilityForType("salon_barbershop").hours.mon.length, 0, "barbers closed Monday by default");
  assert.equal(defaultAvailabilityForType("unknown").enabled, true);
});

test("localNow converts to the business timezone", () => {
  const instant = new Date("2026-11-30T23:30:00Z");
  assert.deepEqual(localNow("Australia/Sydney", instant), { date: "2026-12-01", minutes: 10 * 60 + 30 });
  assert.deepEqual(localNow("Europe/London", instant), { date: "2026-11-30", minutes: 23 * 60 + 30 });
  assert.deepEqual(localNow("Not/AZone", instant), { date: "2026-11-30", minutes: 23 * 60 + 30 }, "bad tz falls back to UTC");
});
