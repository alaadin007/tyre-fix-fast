ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS tyre_size text,
  ADD COLUMN IF NOT EXISTS tyre_brand text,
  ADD COLUMN IF NOT EXISTS tyre_type text,
  ADD COLUMN IF NOT EXISTS tread_condition text,
  ADD COLUMN IF NOT EXISTS wheel_type text,
  ADD COLUMN IF NOT EXISTS tyre_details text;