-- Migration: Business slug + branded enquiry page settings
-- Adds a public slug, brand colors/logo overrides, and per-business
-- enquiry flow configuration (auto-quote, deposit, quote validity, etc.)

-- -------------------------------------------------------
-- 1. Core slug + branding columns
-- -------------------------------------------------------
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#E8193C',
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS enquiry_page_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enquiry_auto_quote boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enquiry_response_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS enquiry_deposit_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS enquiry_deposit_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enquiry_deposit_percentage numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enquiry_quote_validity_hours integer DEFAULT 48,
  ADD COLUMN IF NOT EXISTS enquiry_cancellation_policy text DEFAULT '',
  ADD COLUMN IF NOT EXISTS enquiry_confirmation_message text DEFAULT '';

-- Unique index on slug (ignoring NULL)
CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique
  ON businesses (lower(slug))
  WHERE slug IS NOT NULL;

-- -------------------------------------------------------
-- 2. Backfill slugs for existing businesses
-- -------------------------------------------------------
DO $$
DECLARE
  biz RECORD;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR biz IN
    SELECT id, business_name
    FROM businesses
    WHERE slug IS NULL
    ORDER BY created_at ASC
  LOOP
    base_slug := lower(regexp_replace(coalesce(biz.business_name, ''), '[^a-zA-Z0-9]+', '', 'g'));
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'business' || substr(replace(biz.id::text, '-', ''), 1, 8);
    END IF;

    candidate := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM businesses WHERE lower(slug) = candidate AND id <> biz.id) LOOP
      counter := counter + 1;
      candidate := base_slug || counter::text;
    END LOOP;

    UPDATE businesses SET slug = candidate WHERE id = biz.id;
  END LOOP;
END $$;
