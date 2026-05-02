-- App-wide settings (singleton row)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert app settings"
  ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update app settings"
  ON public.app_settings FOR UPDATE USING (true);

CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed dispatch mode (manual by default)
INSERT INTO public.app_settings (key, value)
VALUES ('dispatch', jsonb_build_object('auto_assign', false))
ON CONFLICT (key) DO NOTHING;

-- Allow updating allocations (status changes) and tracking approval
ALTER TABLE public.job_allocations
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text;