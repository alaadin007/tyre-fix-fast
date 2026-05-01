
-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  postcode TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  issue_description TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  damage_type TEXT,
  damage_summary TEXT,
  damage_confidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a job (anonymous customers)
CREATE POLICY "Anyone can create jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (true);

-- Anyone can read jobs (customer needs to view their job via direct link;
-- ID is a UUID and acts as the access token)
CREATE POLICY "Anyone can view jobs"
  ON public.jobs FOR SELECT
  USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Storage bucket for job photos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload to job-photos
CREATE POLICY "Anyone can upload job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-photos');

-- Anyone can read job photos (bucket is public anyway, but explicit policy)
CREATE POLICY "Anyone can read job photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');
