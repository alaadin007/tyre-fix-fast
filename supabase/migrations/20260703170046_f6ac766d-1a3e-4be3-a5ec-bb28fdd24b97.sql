
DO $$
DECLARE
  j uuid := 'a1e98fbf-713a-47f4-96f4-f6a59e40bc7d';
BEGIN
  DELETE FROM public.job_allocations WHERE job_id = j;
  DELETE FROM public.quotes WHERE job_id = j;
  DELETE FROM public.ops_alerts WHERE job_id = j;
  DELETE FROM public.short_links WHERE job_id = j;
  DELETE FROM public.reviews WHERE job_id = j;
  DELETE FROM public.sms_messages WHERE job_id = j;
  UPDATE public.conversations SET current_job_id = NULL WHERE current_job_id = j;
  DELETE FROM public.admin_states WHERE job_id = j;
  DELETE FROM public.jobs WHERE id = j;
END $$;
