ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS assignment_status TEXT;
-- Backfill: jobs already in_progress/accepted are considered details_sent.
UPDATE public.jobs SET assignment_status = 'details_sent'
  WHERE assignment_status IS NULL AND status IN ('in_progress','accepted','completed','closed');
UPDATE public.jobs SET assignment_status = 'pending'
  WHERE assignment_status IS NULL AND platform_fee_status = 'paid';