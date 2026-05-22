CREATE TABLE public.short_links (
  code TEXT PRIMARY KEY,
  target_url TEXT NOT NULL,
  kind TEXT,
  job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read short links" ON public.short_links FOR SELECT USING (true);
CREATE INDEX short_links_job_idx ON public.short_links(job_id);