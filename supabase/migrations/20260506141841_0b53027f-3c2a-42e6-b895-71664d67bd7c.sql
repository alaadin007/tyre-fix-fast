CREATE POLICY "Public can insert technicians from admin"
ON public.technicians FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can view technicians"
ON public.technicians FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can update technicians from admin"
ON public.technicians FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);