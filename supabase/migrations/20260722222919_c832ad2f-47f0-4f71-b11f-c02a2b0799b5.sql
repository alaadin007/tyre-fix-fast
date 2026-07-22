
DO $$
DECLARE
  v_job uuid := '17df8fdc-1005-4b22-bfda-4b5b47480878';
  v_phone text := '+923332867129';
BEGIN
  DELETE FROM public.quotes WHERE job_id = v_job;
  DELETE FROM public.job_allocations WHERE job_id = v_job;
  DELETE FROM public.ops_alerts WHERE job_id = v_job;
  DELETE FROM public.sms_messages WHERE job_id = v_job OR from_number = v_phone OR to_number = v_phone;
  DELETE FROM public.conversations WHERE customer_phone = v_phone;
  DELETE FROM public.jobs WHERE id = v_job;
  DELETE FROM public.customers WHERE phone = v_phone;
END $$;
