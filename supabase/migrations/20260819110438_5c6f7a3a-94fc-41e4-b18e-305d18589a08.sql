
DROP POLICY IF EXISTS "Anyone can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.jobs;

REVOKE ALL ON public.jobs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

CREATE POLICY "Admins can view all jobs" ON public.jobs
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert jobs" ON public.jobs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update jobs" ON public.jobs
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete jobs" ON public.jobs
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Technicians can view assigned jobs" ON public.jobs
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.technicians t
    WHERE t.id = jobs.assigned_technician_id AND t.user_id = auth.uid()
  )
);

REVOKE UPDATE, DELETE ON public.technician_locations FROM authenticated;
REVOKE ALL ON public.technician_locations FROM anon;
GRANT SELECT, INSERT ON public.technician_locations TO authenticated;
GRANT ALL ON public.technician_locations TO service_role;
