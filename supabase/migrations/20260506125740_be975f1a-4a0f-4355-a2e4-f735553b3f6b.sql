
CREATE OR REPLACE FUNCTION public.trigger_notify_new_tech_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  msg text;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.approval_status = 'pending')
     OR (TG_OP = 'UPDATE' AND NEW.approval_status = 'pending' AND OLD.approval_status IS DISTINCT FROM 'pending') THEN
    msg := '🧰 New technician application' || E'\n' ||
           NEW.name || ' · ' || NEW.phone || E'\n' ||
           'Postcodes: ' || COALESCE(array_to_string(NEW.service_postcodes, ','), '—') || E'\n\n' ||
           'Reply: APPROVE ' || substring(NEW.id::text, 1, 6) ||
           '  or  REJECT ' || substring(NEW.id::text, 1, 6) || ' reason';
    PERFORM net.http_post(
      url := 'https://ctxtvezeeijkjjuzodvi.supabase.co/functions/v1/notify-admins',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0eHR2ZXplZWlqa2pqdXpvZHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTY1MzEsImV4cCI6MjA5MzIzMjUzMX0.GY68HkQhD3-NhO1-dJDzPK09rEd6XKNbkVaKVGmRnxo'
      ),
      body := jsonb_build_object('body', msg, 'channel', 'whatsapp')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_tech_application ON public.technicians;
CREATE TRIGGER notify_new_tech_application
AFTER INSERT OR UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_new_tech_application();
