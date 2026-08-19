-- 1) job-photos: remove anonymous/public upload ability. Uploads happen only from
-- server-side edge functions using the service role (which bypasses RLS).
DROP POLICY IF EXISTS "Anyone can upload job photos" ON storage.objects;

-- 2) technician-photos / technician-docs: require the caller to actually be a
-- registered technician AND own the folder, instead of folder-naming convention alone.
DROP POLICY IF EXISTS "Technicians upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians view own docs" ON storage.objects;
DROP POLICY IF EXISTS "Technicians upload own docs" ON storage.objects;
DROP POLICY IF EXISTS "Technicians update own docs" ON storage.objects;
DROP POLICY IF EXISTS "Technicians delete own docs" ON storage.objects;

CREATE OR REPLACE FUNCTION public.is_own_technician_folder(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (storage.foldername(_path))[1] = auth.uid()::text
     AND EXISTS (
       SELECT 1 FROM public.technicians t WHERE t.user_id = auth.uid()
     );
$$;

CREATE POLICY "Technicians upload own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'technician-photos' AND public.is_own_technician_folder(name));

CREATE POLICY "Technicians update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'technician-photos' AND public.is_own_technician_folder(name))
  WITH CHECK (bucket_id = 'technician-photos' AND public.is_own_technician_folder(name));

CREATE POLICY "Technicians delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'technician-photos' AND public.is_own_technician_folder(name));

CREATE POLICY "Technicians view own docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'technician-docs' AND public.is_own_technician_folder(name));

CREATE POLICY "Technicians upload own docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'technician-docs' AND public.is_own_technician_folder(name));

CREATE POLICY "Technicians update own docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'technician-docs' AND public.is_own_technician_folder(name))
  WITH CHECK (bucket_id = 'technician-docs' AND public.is_own_technician_folder(name));

CREATE POLICY "Technicians delete own docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'technician-docs' AND public.is_own_technician_folder(name));