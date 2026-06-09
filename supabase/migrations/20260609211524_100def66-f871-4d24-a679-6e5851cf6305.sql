
-- 1) Technician public code (TECH-0001 …) -------------------------------
CREATE SEQUENCE IF NOT EXISTS public.technician_code_seq START 1;

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS tech_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.set_technician_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tech_code IS NULL OR length(trim(NEW.tech_code)) = 0 THEN
    NEW.tech_code := 'TECH-' || lpad(nextval('public.technician_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_technician_code ON public.technicians;
CREATE TRIGGER trg_set_technician_code
  BEFORE INSERT ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.set_technician_code();

-- Backfill existing technicians in creation order.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.technicians
  WHERE tech_code IS NULL
)
UPDATE public.technicians t
SET tech_code = 'TECH-' || lpad(o.rn::text, 4, '0')
FROM ordered o
WHERE t.id = o.id;

-- Advance the sequence past any backfilled values.
SELECT setval(
  'public.technician_code_seq',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(NULLIF(regexp_replace(tech_code, '\D', '', 'g'), '')::int)
       FROM public.technicians),
      0
    )
  )
);

-- 2) Quote window on each broadcast allocation --------------------------
ALTER TABLE public.job_allocations
  ADD COLUMN IF NOT EXISTS quote_window_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_job_allocations_quote_window
  ON public.job_allocations(quote_window_expires_at);

-- 3) Track when the aggregated quote summary was sent to admins ---------
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS quote_summary_sent_at timestamptz;
