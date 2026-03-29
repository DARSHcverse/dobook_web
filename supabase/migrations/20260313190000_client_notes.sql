-- Client notes table for CRM.
-- Generated: 2026-03-13

begin;

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_email text not null,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists client_notes_business_id_idx on public.client_notes (business_id);
create index if not exists client_notes_customer_email_idx on public.client_notes (customer_email);
create unique index if not exists client_notes_business_email_key on public.client_notes (business_id, customer_email);

alter table if exists public.client_notes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'client_notes' and policyname = 'client_notes_select_own') then
    create policy client_notes_select_own
      on public.client_notes
      for select
      to authenticated
      using (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'client_notes' and policyname = 'client_notes_insert_own') then
    create policy client_notes_insert_own
      on public.client_notes
      for insert
      to authenticated
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'client_notes' and policyname = 'client_notes_update_own') then
    create policy client_notes_update_own
      on public.client_notes
      for update
      to authenticated
      using (business_id = auth.uid())
      with check (business_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'client_notes' and policyname = 'client_notes_delete_own') then
    create policy client_notes_delete_own
      on public.client_notes
      for delete
      to authenticated
      using (business_id = auth.uid());
  end if;
end $$;

commit;
