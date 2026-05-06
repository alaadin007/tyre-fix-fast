ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS vehicle_reg text,
  ADD COLUMN IF NOT EXISTS affected_wheels text[] NOT NULL DEFAULT '{}'::text[];