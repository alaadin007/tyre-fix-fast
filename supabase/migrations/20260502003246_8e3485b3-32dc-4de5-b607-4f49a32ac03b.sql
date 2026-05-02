
-- Technicians
CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  service_postcodes text[] NOT NULL DEFAULT '{}',
  vehicle text,
  rating numeric(3,2) DEFAULT 5.0,
  jobs_completed int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view technicians" ON public.technicians FOR SELECT USING (true);
CREATE POLICY "Anyone can insert technicians" ON public.technicians FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update technicians" ON public.technicians FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete technicians" ON public.technicians FOR DELETE USING (true);

-- SMS messages (in & out)
CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL DEFAULT '',
  num_media int NOT NULL DEFAULT 0,
  media_urls text[] NOT NULL DEFAULT '{}',
  twilio_sid text,
  job_id uuid,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_messages_created_at ON public.sms_messages(created_at DESC);
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sms" ON public.sms_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sms" ON public.sms_messages FOR INSERT WITH CHECK (true);

-- Allocations
CREATE TABLE public.job_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  ai_reasoning text,
  match_score numeric(5,2),
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_allocations_created_at ON public.job_allocations(created_at DESC);
ALTER TABLE public.job_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view allocations" ON public.job_allocations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert allocations" ON public.job_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update allocations" ON public.job_allocations FOR UPDATE USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_technicians_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_allocations;
