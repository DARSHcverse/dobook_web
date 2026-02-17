alter table if exists public.bookings
  add column if not exists reminder_5d_scheduled_at timestamptz,
  add column if not exists reminder_1d_scheduled_at timestamptz;

create index if not exists bookings_reminder_5d_scheduled_at_idx on public.bookings (reminder_5d_scheduled_at);
create index if not exists bookings_reminder_1d_scheduled_at_idx on public.bookings (reminder_1d_scheduled_at);

