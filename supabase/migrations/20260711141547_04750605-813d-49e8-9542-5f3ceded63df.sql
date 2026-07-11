ALTER TABLE public.sms_messages
ADD COLUMN IF NOT EXISTS job_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'sms_messages'
      AND kcu.column_name = 'job_id'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'jobs'
      AND ccu.column_name = 'id'
  ) THEN
    ALTER TABLE public.sms_messages
    ADD CONSTRAINT sms_messages_job_id_fkey
    FOREIGN KEY (job_id)
    REFERENCES public.jobs(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sms_messages_job_id_created_at
ON public.sms_messages (job_id, created_at DESC);