# Supabase Setup (Schema)

This repo currently stores data in `apps/web/localdb.json` via Next.js `/api/*` routes.
To use Supabase Postgres, create the tables first.

## Create tables

1. Open Supabase Dashboard → **SQL Editor**
2. Create a **New query**
3. Paste and run: `supabase/migrations/20260215160000_init_dobook.sql`

## What gets created

- `public.businesses` (acts as "users" today)
- `public.sessions` (bearer tokens)
- `public.bookings`
- `public.invoice_templates`
- `public.extractions`
- `public.invoices` (optional / future use)

## Next step (wiring the app)

After tables exist, the Next.js API routes in `apps/web/src/app/api/*` need to be updated to read/write Supabase instead of `apps/web/localdb.json`.

