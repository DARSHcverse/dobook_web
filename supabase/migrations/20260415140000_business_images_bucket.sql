-- Migration: business-images storage bucket
-- Public read, business-scoped uploads (path prefix must start with business_id)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-images',
  'business-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read
DROP POLICY IF EXISTS "public_read_business_images" ON storage.objects;
CREATE POLICY "public_read_business_images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-images');

-- Service role full access (used by API routes)
DROP POLICY IF EXISTS "service_role_all_business_images" ON storage.objects;
CREATE POLICY "service_role_all_business_images"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'business-images')
  WITH CHECK (bucket_id = 'business-images');
