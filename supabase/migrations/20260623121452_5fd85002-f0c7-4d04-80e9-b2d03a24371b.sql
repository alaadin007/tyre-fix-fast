ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check CHECK (status IN ('pending','accepted','lost','paid','forwarded','sent','proposed'));
COMMENT ON COLUMN public.quotes.status IS 'pending | accepted | lost | paid | forwarded';