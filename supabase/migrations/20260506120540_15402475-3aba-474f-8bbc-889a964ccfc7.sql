ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS last_lat numeric,
  ADD COLUMN IF NOT EXISTS last_lng numeric,
  ADD COLUMN IF NOT EXISTS last_location_at timestamptz;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS callout_fee_gbp numeric,
  ADD COLUMN IF NOT EXISTS tyre_included boolean,
  ADD COLUMN IF NOT EXISTS tyre_condition text,
  ADD COLUMN IF NOT EXISTS quote_deadline timestamptz;