
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TECHNICIANS EXTENSIONS ============
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS travel_radius_miles integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment_photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_now boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_until timestamptz,
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS insurance_doc_url text,
  ADD COLUMN IF NOT EXISTS id_doc_url text,
  ADD COLUMN IF NOT EXISTS public_liability_doc_url text;

-- Existing rows: treat as already approved so dispatch keeps working
UPDATE public.technicians SET approval_status = 'approved', approved_at = now()
WHERE approval_status = 'pending' AND active = true;

-- ============ TIGHTEN RLS ON technicians ============
DROP POLICY IF EXISTS "Anyone can view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Anyone can insert technicians" ON public.technicians;
DROP POLICY IF EXISTS "Anyone can update technicians" ON public.technicians;
DROP POLICY IF EXISTS "Anyone can delete technicians" ON public.technicians;

CREATE POLICY "Technicians can view own row"
  ON public.technicians FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all technicians"
  ON public.technicians FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians can insert own row"
  ON public.technicians FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert technicians"
  ON public.technicians FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians can update own row"
  ON public.technicians FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND approval_status = (SELECT approval_status FROM public.technicians WHERE id = technicians.id));

CREATE POLICY "Admins can update technicians"
  ON public.technicians FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete technicians"
  ON public.technicians FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-photos', 'technician-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-docs', 'technician-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Photos: public read, owner-managed in their own folder (folder = auth uid)
CREATE POLICY "Technician photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'technician-photos');

CREATE POLICY "Technicians upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'technician-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Technicians update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'technician-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Technicians delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'technician-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Docs: private. Owner + admins only.
CREATE POLICY "Technicians view own docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'technician-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'technician-docs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Technicians upload own docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'technician-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Technicians update own docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'technician-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============ TRIGGER for updated_at on technicians (if not present) ============
DROP TRIGGER IF EXISTS update_technicians_updated_at ON public.technicians;
CREATE TRIGGER update_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON public.technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_technicians_approval_status ON public.technicians(approval_status);
