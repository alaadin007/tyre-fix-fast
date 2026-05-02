
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS platform_fee_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS platform_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS platform_fee_refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_url text,
  ADD COLUMN IF NOT EXISTS assigned_technician_id uuid;

-- Allow updates to jobs (currently no UPDATE policy exists)
DROP POLICY IF EXISTS "Anyone can update jobs" ON public.jobs;
CREATE POLICY "Anyone can update jobs"
  ON public.jobs
  FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_jobs_stripe_session ON public.jobs(stripe_session_id);
