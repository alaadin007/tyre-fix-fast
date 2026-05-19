
-- Enum for intake steps
DO $$ BEGIN
  CREATE TYPE public.intake_step AS ENUM (
    'awaiting_location',
    'awaiting_plate',
    'awaiting_name',
    'awaiting_description',
    'awaiting_wheels',
    'awaiting_photos',
    'complete',
    'idle'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Customer long-term memory
CREATE TABLE IF NOT EXISTS public.customers (
  phone TEXT PRIMARY KEY,
  full_name TEXT,
  default_postcode TEXT,
  vehicle_reg TEXT,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view customers" ON public.customers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert customers" ON public.customers FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversation state
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  current_job_id UUID,
  step public.intake_step NOT NULL DEFAULT 'awaiting_location',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_phone_active_idx
  ON public.conversations (customer_phone, last_message_at DESC)
  WHERE step <> 'complete';

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view conversations" ON public.conversations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can update conversations" ON public.conversations FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill customers from existing jobs (keep most recent non-null values)
INSERT INTO public.customers (phone, full_name, default_postcode, vehicle_reg, total_jobs, last_seen_at)
SELECT
  customer_phone AS phone,
  (ARRAY_AGG(customer_name ORDER BY created_at DESC) FILTER (WHERE customer_name IS NOT NULL))[1] AS full_name,
  (ARRAY_AGG(postcode ORDER BY created_at DESC) FILTER (WHERE postcode IS NOT NULL))[1] AS default_postcode,
  (ARRAY_AGG(vehicle_reg ORDER BY created_at DESC) FILTER (WHERE vehicle_reg IS NOT NULL))[1] AS vehicle_reg,
  COUNT(*)::int AS total_jobs,
  MAX(created_at) AS last_seen_at
FROM public.jobs
WHERE customer_phone IS NOT NULL AND customer_phone <> ''
GROUP BY customer_phone
ON CONFLICT (phone) DO NOTHING;
