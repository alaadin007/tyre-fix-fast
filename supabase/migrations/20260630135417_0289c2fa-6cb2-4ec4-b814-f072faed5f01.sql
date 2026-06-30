ALTER TABLE public.job_allocations
  ADD COLUMN IF NOT EXISTS broadcast_status text,
  ADD COLUMN IF NOT EXISTS broadcast_error text;