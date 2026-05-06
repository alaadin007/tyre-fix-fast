CREATE TABLE public.tech_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tech_otp_phone ON public.tech_otp_codes(phone, created_at DESC);
ALTER TABLE public.tech_otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies → only service role can access.