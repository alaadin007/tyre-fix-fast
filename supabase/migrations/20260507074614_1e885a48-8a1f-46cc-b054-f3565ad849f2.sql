CREATE TABLE IF NOT EXISTS public.tech_onboarding_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  technician_id uuid,
  phone text NOT NULL,
  channel text,
  direction text NOT NULL DEFAULT 'inbound',
  inbound_body text,
  has_media boolean NOT NULL DEFAULT false,
  media_count integer NOT NULL DEFAULT 0,
  detected_intent text,
  prior_status text,
  next_status text,
  route_taken text NOT NULL,
  ai_extracted jsonb,
  reply_sent text,
  notes text
);

CREATE INDEX IF NOT EXISTS tech_onboarding_logs_phone_idx ON public.tech_onboarding_logs(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS tech_onboarding_logs_tech_idx ON public.tech_onboarding_logs(technician_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tech_onboarding_logs_created_idx ON public.tech_onboarding_logs(created_at DESC);

ALTER TABLE public.tech_onboarding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view onboarding logs"
  ON public.tech_onboarding_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert onboarding logs"
  ON public.tech_onboarding_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
