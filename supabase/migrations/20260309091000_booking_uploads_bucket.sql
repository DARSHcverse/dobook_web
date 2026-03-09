-- Storage bucket for customer booking uploads (e.g. trades photos)
-- Generated: 2026-03-09

begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('booking_uploads', 'booking_uploads', true)
    on conflict (id) do update set public = excluded.public;
  end if;
end $$;

commit;

