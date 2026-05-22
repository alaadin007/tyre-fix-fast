CREATE TABLE IF NOT EXISTS public.admin_states (
  phone text PRIMARY KEY,
  step text NOT NULL,
  job_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view admin_states" ON public.admin_states FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin_states" ON public.admin_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin_states" ON public.admin_states FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete admin_states" ON public.admin_states FOR DELETE USING (true);