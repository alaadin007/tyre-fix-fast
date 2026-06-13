CREATE TABLE IF NOT EXISTS public.pending_admin_actions (
  admin_phone text PRIMARY KEY,
  intent text NOT NULL,
  awaiting text NOT NULL,
  job_reference text,
  technician_id text,
  extra_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_admin_actions TO authenticated;
GRANT ALL ON public.pending_admin_actions TO service_role;
ALTER TABLE public.pending_admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage pending_admin_actions"
ON public.pending_admin_actions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
CREATE POLICY "Service role can manage pending_admin_actions"
ON public.pending_admin_actions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);