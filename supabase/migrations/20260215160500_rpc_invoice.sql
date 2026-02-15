-- Helpers for DoBook on Supabase Postgres
-- Generated: 2026-02-15

begin;

-- Atomically increments invoice_seq and returns a formatted invoice id.
create or replace function public.next_invoice_id(p_business_id uuid)
returns table(invoice_id text, seq integer)
language plpgsql
as $$
declare
  next_seq integer;
begin
  update public.businesses
    set invoice_seq = coalesce(invoice_seq, 0) + 1
    where id = p_business_id
    returning invoice_seq into next_seq;

  if not found then
    raise exception 'Business not found';
  end if;

  seq := next_seq;
  invoice_id := 'PB-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(next_seq::text, 3, '0');
  return next;
end;
$$;

commit;

