
-- Track live location history (kept for audit + replay) and current live window
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS live_location_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_location_accuracy numeric;

CREATE TABLE IF NOT EXISTS public.technician_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  accuracy numeric,
  source text NOT NULL DEFAULT 'whatsapp',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_loc_tech_created
  ON public.technician_locations (technician_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tech_loc_expires
  ON public.technician_locations (expires_at);

ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all locations"
  ON public.technician_locations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Technicians can view own locations"
  ON public.technician_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.id = technician_locations.technician_id
        AND t.user_id = auth.uid()
    )
  );

-- Server-side (service role) inserts from webhook bypass RLS, but allow
-- authenticated techs to insert their own pings too if we ever add a web UI.
CREATE POLICY "Technicians can insert own locations"
  ON public.technician_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.id = technician_locations.technician_id
        AND t.user_id = auth.uid()
    )
  );

-- Realtime so the admin map updates as pings arrive
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_locations;
ALTER TABLE public.technician_locations REPLICA IDENTITY FULL;
