-- Reminder settings for businesses.
-- Generated: 2026-03-13

begin;

alter table if exists public.businesses
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists reminder_times integer[] not null default array[48, 2],
  add column if not exists reminder_custom_message text not null default '',
  add column if not exists reminder_include_payment_link boolean not null default true,
  add column if not exists reminder_include_booking_details boolean not null default true,
  add column if not exists confirmation_email_enabled boolean not null default true;

commit;
