-- Migration: Photo Booth Enquiry & Quote Flow
-- Creates package_categories, packages tables and extends bookings

-- -------------------------------------------------------
-- 1. package_categories
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_categories_business_id
  ON package_categories (business_id);

ALTER TABLE package_categories ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
CREATE POLICY "service_role_all_package_categories"
  ON package_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can read active categories
CREATE POLICY "public_read_active_package_categories"
  ON package_categories
  FOR SELECT
  TO anon
  USING (is_active = true);

-- -------------------------------------------------------
-- 2. packages
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES package_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_hours numeric(4,1) DEFAULT 3,
  image_url text DEFAULT '',
  features text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_business_id
  ON packages (business_id);
CREATE INDEX IF NOT EXISTS idx_packages_category_id
  ON packages (category_id);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all_packages"
  ON packages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can read active packages
CREATE POLICY "public_read_active_packages"
  ON packages
  FOR SELECT
  TO anon
  USING (is_active = true);

-- -------------------------------------------------------
-- 3. Extend bookings table for enquiry/quote flow
-- -------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES package_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_enquiry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enquiry_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS quoted_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS enquiry_message text DEFAULT '',
  ADD COLUMN IF NOT EXISTS quote_message text DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS num_guests integer,
  ADD COLUMN IF NOT EXISTS referral_source text DEFAULT '';

-- Index for quick enquiry lookups in dashboard
CREATE INDEX IF NOT EXISTS idx_bookings_is_enquiry
  ON bookings (business_id, is_enquiry)
  WHERE is_enquiry = true;
