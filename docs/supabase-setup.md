# Supabase Setup (Schema)

This repo currently stores data in `apps/web/localdb.json` via Next.js `/api/*` routes.
To use Supabase Postgres, create the tables first.

## Create tables

1. Open Supabase Dashboard → **SQL Editor**
2. Create a **New query**
3. Paste and run: `supabase/migrations/20260215160000_init_dobook.sql`
4. Paste and run: `supabase/migrations/20260215180000_booking_editor_fields_and_reminders.sql`

## What gets created

- `public.businesses` (acts as "users" today)
- `public.sessions` (bearer tokens)
- `public.bookings`
- `public.invoice_templates`
- `public.extractions`
- `public.invoices` (optional / future use)

## Next step (wiring the app)

After tables exist, the Next.js API routes in `apps/web/src/app/api/*` need to be updated to read/write Supabase instead of `apps/web/localdb.json`.

## App dependency + env vars

- The Next.js app uses `@supabase/supabase-js` (see `apps/web/src/lib/supabaseAdmin.js`).
- For server-side routes, set `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` (recommended). For client-side usage, prefer `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Emails + reminders (optional)

- Booking confirmation emails (client + business) are sent via Resend when `RESEND_API_KEY` is set.
- Configure the sender with `RESEND_FROM` (example: `DoBook <no-reply@yourdomain.com>`).
- Client reminder emails are sent 5 days + 1 day before the event via `POST`/`GET` `apps/web/src/app/api/cron/send-reminders/route.js` (protect with `CRON_SECRET`).
- On Vercel, set up a daily Cron to call `/api/cron/send-reminders` and include the secret (either `Authorization: Bearer $CRON_SECRET` or `?cron_secret=$CRON_SECRET`).
