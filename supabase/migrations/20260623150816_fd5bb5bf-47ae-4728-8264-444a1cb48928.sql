ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check CHECK (status IN ('collecting','pending','accepted','lost','paid','forwarded','sent','proposed','rejected'));
COMMENT ON COLUMN public.quotes.status IS 'collecting | pending | accepted | lost | paid | forwarded | sent | proposed | rejected';