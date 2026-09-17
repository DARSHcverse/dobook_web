-- Design Studio: saved photo strip / monogram designs and customer approvals.
-- Generated: 2026-09-17

begin;

-- ---------------------------------------------------------------------------
-- Saved designs (template library)
-- ---------------------------------------------------------------------------
create table if not exists public.design_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  -- 'strip' or 'monogram'. Kept as text rather than an enum so adding a new
  -- design type later does not need a migration on this table.
  kind text not null default 'strip',
  -- The normalized design spec. Stored whole because the renderer consumes it
  -- as one object; splitting it into columns would couple the schema to the
  -- spec shape, which still evolves.
  spec jsonb not null,
  -- Booking this design was created from, for reference. Nulled rather than
  -- cascade-deleted so a saved template survives its originating booking.
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_design_templates_business
  on public.design_templates (business_id, created_at desc);

alter table if exists public.design_templates enable row level security;

do $$
begin
  -- API routes use the service role; these policies exist so the table is not
  -- readable by the anon key if it is ever queried directly.
  if not exists (select 1 from pg_policies where schemaname = 'public'
                 and tablename = 'design_templates' and policyname = 'design_templates_service_all') then
    create policy design_templates_service_all
      on public.design_templates
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Customer approval of a design
-- ---------------------------------------------------------------------------
alter table if exists public.bookings
  -- The design sent to the customer, and where they are up to with it.
  add column if not exists design_spec jsonb,
  add column if not exists design_kind text,
  add column if not exists design_preview_url text,
  -- pending | approved | changes_requested
  add column if not exists design_status text,
  add column if not exists design_feedback text,
  -- Unguessable token so the customer can respond without an account.
  add column if not exists design_token uuid,
  add column if not exists design_sent_at timestamptz,
  add column if not exists design_responded_at timestamptz;

create unique index if not exists idx_bookings_design_token
  on public.bookings (design_token)
  where design_token is not null;

commit;
