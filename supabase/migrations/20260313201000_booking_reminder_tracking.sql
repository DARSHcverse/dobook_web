-- Track which reminder offsets have been sent per booking.
-- Generated: 2026-03-13

begin;

alter table if exists public.bookings
  add column if not exists reminder_sent_hours integer[] not null default array[]::integer[];

commit;
