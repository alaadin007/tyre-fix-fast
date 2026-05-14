
CREATE OR REPLACE FUNCTION public.trigger_notify_tech_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.approval_status IN ('approved', 'rejected')
     AND NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    PERFORM net.http_post(
      url := 'https://ctxtvezeeijkjjuzodvi.supabase.co/functions/v1/notify-tech-status',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0eHR2ZXplZWlqa2pqdXpvZHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTY1MzEsImV4cCI6MjA5MzIzMjUzMX0.GY68HkQhD3-NhO1-dJDzPK09rEd6XKNbkVaKVGmRnxo'
      ),
      body := jsonb_build_object(
        'technician_id', NEW.id::text,
        'status', NEW.approval_status,
        'reason', COALESCE(NEW.rejected_reason, '')
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_tech_status_change ON public.technicians;
CREATE TRIGGER notify_tech_status_change
AFTER UPDATE OF approval_status ON public.technicians
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_tech_status_change();
