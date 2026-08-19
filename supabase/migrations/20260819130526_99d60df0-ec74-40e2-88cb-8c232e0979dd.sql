-- job-photos: remove the blanket anonymous read policy on the objects API.
-- Photos still render for WhatsApp providers and the vision AI via unguessable
-- public CDN URLs, but the storage API itself no longer grants anon listing/reads.
DROP POLICY IF EXISTS "Anyone can read job photos" ON storage.objects;

CREATE POLICY "Staff can read job photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-photos');