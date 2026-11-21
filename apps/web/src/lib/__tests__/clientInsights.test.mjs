import { test } from "node:test";
import assert from "node:assert/strict";
import { clientRetention } from "../clientInsights.js";

const b = (date, status = "confirmed") => ({ booking_date: date, status });
const TODAY = "2026-11-22";

test("a regular two weeks past their usual gap is overdue", () => {
  const r = clientRetention([b("2026-09-06"), b("2026-10-04"), b("2026-10-18")], TODAY);
  assert.equal(r.visits, 3);
  assert.equal(r.usual_gap_days, 21, "median of 28 and 14");
  assert.equal(r.next_due_date, "2026-11-08");
  assert.equal(r.rebook_status, "overdue", "14 days past due > 25% of 21");
});

test("someone just inside their rhythm is due soon", () => {
  const r = clientRetention([b("2026-10-01"), b("2026-10-29")], TODAY);
  assert.equal(r.usual_gap_days, 28);
  assert.equal(r.next_due_date, "2026-11-26");
  assert.equal(r.rebook_status, "due");
});

test("an upcoming booking means booked, regardless of rhythm", () => {
  const r = clientRetention([b("2026-01-01"), b("2026-02-01"), b("2026-12-05")], TODAY);
  assert.equal(r.rebook_status, "booked");
  assert.equal(r.upcoming_date, "2026-12-05");
});

test("one visit is new; cancellations are counted but never visits", () => {
  const r = clientRetention([b("2026-11-01"), b("2026-11-10", "cancelled")], TODAY);
  assert.equal(r.visits, 1);
  assert.equal(r.cancelled, 1);
  assert.equal(r.rebook_status, "new");
  assert.equal(r.usual_gap_days, null);
});

test("far from due is ok, and junk input does not throw", () => {
  assert.equal(clientRetention([b("2026-06-01"), b("2026-11-15")], TODAY).rebook_status, "ok");
  assert.doesNotThrow(() => clientRetention([{ booking_date: "nope" }, null].filter(Boolean), TODAY));
  assert.equal(clientRetention([], TODAY).rebook_status, "new");
});
