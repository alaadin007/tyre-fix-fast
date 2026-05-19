ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE public.customers ADD CONSTRAINT customers_phone_key UNIQUE (phone);
CREATE POLICY "Anyone can delete customers" ON public.customers FOR DELETE USING (true);