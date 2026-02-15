-- Enable RLS to prevent direct access via anon/authenticated keys.
-- Note: service_role bypasses RLS, so keep that key server-only.
-- Generated: 2026-02-15

begin;

alter table if exists public.businesses enable row level security;
alter table if exists public.sessions enable row level security;
alter table if exists public.bookings enable row level security;
alter table if exists public.invoice_templates enable row level security;
alter table if exists public.extractions enable row level security;
alter table if exists public.invoices enable row level security;

commit;

