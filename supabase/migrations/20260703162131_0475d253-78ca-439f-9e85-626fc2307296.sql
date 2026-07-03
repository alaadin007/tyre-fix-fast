
DO $$
DECLARE
  v_tail  text := '%3332867129%';
  v_cust  uuid := 'cdd66129-5e30-403c-a171-9cd2161a71fc';
  v_jobs  uuid[];
BEGIN
  SELECT array_agg(id) INTO v_jobs FROM public.jobs WHERE customer_phone LIKE v_tail;

  IF v_jobs IS NOT NULL THEN
    DELETE FROM public.job_allocations WHERE job_id = ANY(v_jobs);
    DELETE FROM public.quotes WHERE job_id = ANY(v_jobs);
    DELETE FROM public.ops_alerts WHERE job_id = ANY(v_jobs);
    DELETE FROM public.short_links WHERE job_id = ANY(v_jobs);
    DELETE FROM public.reviews WHERE job_id = ANY(v_jobs);
    DELETE FROM public.sms_messages WHERE job_id = ANY(v_jobs);
    UPDATE public.conversations SET current_job_id = NULL WHERE current_job_id = ANY(v_jobs);
    UPDATE public.admin_states SET job_id = NULL WHERE job_id = ANY(v_jobs);
  END IF;

  DELETE FROM public.pending_admin_actions WHERE admin_phone LIKE v_tail;
  DELETE FROM public.sms_messages WHERE from_number LIKE v_tail OR to_number LIKE v_tail;
  DELETE FROM public.conversations WHERE customer_phone LIKE v_tail;
  DELETE FROM public.admin_states WHERE phone LIKE v_tail;
  DELETE FROM public.jobs WHERE customer_phone LIKE v_tail;
  DELETE FROM public.customers WHERE id = v_cust OR phone LIKE v_tail;
END $$;
