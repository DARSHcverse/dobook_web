-- Business type system: templates, booking fields, add-ons, scheduling defaults
-- Generated: 2026-03-09

begin;

-- businesses: business type + scheduling defaults (nullable for existing businesses)
alter table if exists public.businesses
  add column if not exists business_type text,
  add column if not exists buffer_mins integer not null default 0,
  add column if not exists advance_booking_hrs integer not null default 0,
  add column if not exists reminder_timing_hrs integer[] not null default array[]::integer[],
  add column if not exists allow_recurring boolean not null default false,
  add column if not exists require_deposit boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_business_type_check'
  ) then
    alter table public.businesses
      add constraint businesses_business_type_check
      check (
        business_type is null
        or business_type in (
          'salon_barbershop',
          'medical_wellness',
          'consultant',
          'tutoring_education',
          'home_services_trades'
        )
      );
  end if;
end $$;

-- booking form fields (per business)
create table if not exists public.booking_form_fields (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  field_key text not null,
  field_name text not null,
  field_type text not null default 'text',
  required boolean not null default false,
  is_private boolean not null default false,
  sort_order integer not null default 0,
  field_options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists booking_form_fields_business_key_key
  on public.booking_form_fields (business_id, field_key);

create index if not exists booking_form_fields_business_id_idx
  on public.booking_form_fields (business_id);

-- add-ons / extras (per business)
create table if not exists public.service_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null default 0,
  duration_extra_mins integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists service_addons_business_id_idx
  on public.service_addons (business_id);

-- RLS (for future direct Supabase Auth usage)
alter table if exists public.booking_form_fields enable row level security;
alter table if exists public.service_addons enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_form_fields' and policyname = 'booking_form_fields_select_own') then
    create policy booking_form_fields_select_own
      on public.booking_form_fields
      for select
      to authenticated
      using (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_form_fields' and policyname = 'booking_form_fields_insert_own') then
    create policy booking_form_fields_insert_own
      on public.booking_form_fields
      for insert
      to authenticated
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_form_fields' and policyname = 'booking_form_fields_update_own') then
    create policy booking_form_fields_update_own
      on public.booking_form_fields
      for update
      to authenticated
      using (business_id = auth.uid())
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_form_fields' and policyname = 'booking_form_fields_delete_own') then
    create policy booking_form_fields_delete_own
      on public.booking_form_fields
      for delete
      to authenticated
      using (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_addons' and policyname = 'service_addons_select_own') then
    create policy service_addons_select_own
      on public.service_addons
      for select
      to authenticated
      using (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_addons' and policyname = 'service_addons_insert_own') then
    create policy service_addons_insert_own
      on public.service_addons
      for insert
      to authenticated
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_addons' and policyname = 'service_addons_update_own') then
    create policy service_addons_update_own
      on public.service_addons
      for update
      to authenticated
      using (business_id = auth.uid())
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_addons' and policyname = 'service_addons_delete_own') then
    create policy service_addons_delete_own
      on public.service_addons
      for delete
      to authenticated
      using (business_id = auth.uid());
  end if;
end $$;

commit;

