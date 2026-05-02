ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'sms';

CREATE INDEX IF NOT EXISTS sms_messages_channel_idx ON public.sms_messages (channel);