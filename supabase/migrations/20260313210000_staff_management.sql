-- Staff management + booking staff assignment fields.
-- Generated: 2026-03-13

begin;

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists staff_business_id_idx on public.staff (business_id);
create unique index if not exists staff_business_email_key on public.staff (business_id, lower(email));

alter table if exists public.bookings
  add column if not exists staff_id uuid references public.staff(id) on delete set null,
  add column if not exists backdrop_notes text;

create index if not exists bookings_staff_id_idx on public.bookings (staff_id);

alter table if exists public.staff enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'staff_select_own') then
    create policy staff_select_own
      on public.staff
      for select
      to authenticated
      using (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'staff_insert_own') then
    create policy staff_insert_own
      on public.staff
      for insert
      to authenticated
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'staff_update_own') then
    create policy staff_update_own
      on public.staff
      for update
      to authenticated
      using (business_id = auth.uid())
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'staff_delete_own') then
    create policy staff_delete_own
      on public.staff
      for delete
      to authenticated
      using (business_id = auth.uid());
  end if;
end $$;

commit;
