CREATE OR REPLACE FUNCTION public.trigger_notify_new_tech_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.approval_status = 'pending')
     OR (TG_OP = 'UPDATE' AND NEW.approval_status = 'pending' AND OLD.approval_status IS DISTINCT FROM 'pending') THEN
    PERFORM net.http_post(
      url := 'https://ctxtvezeeijkjjuzodvi.supabase.co/functions/v1/notify-admins',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0eHR2ZXplZWlqa2pqdXpvZHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTY1MzEsImV4cCI6MjA5MzIzMjUzMX0.GY68HkQhD3-NhO1-dJDzPK09rEd6XKNbkVaKVGmRnxo'
      ),
      body := jsonb_build_object('event', 'new_tech_application', 'technician_id', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$;