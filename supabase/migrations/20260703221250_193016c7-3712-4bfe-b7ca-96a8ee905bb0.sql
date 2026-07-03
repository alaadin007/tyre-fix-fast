DO $$
DECLARE jid uuid := 'd0651b7b-9f72-4c14-8597-72a2733cd642';
BEGIN
  DELETE FROM job_allocations WHERE job_id = jid;
  DELETE FROM quotes WHERE job_id = jid;
  DELETE FROM ops_alerts WHERE job_id = jid;
  DELETE FROM short_links WHERE job_id = jid;
  DELETE FROM reviews WHERE job_id = jid;
  DELETE FROM sms_messages WHERE job_id = jid;
  UPDATE conversations SET current_job_id = NULL WHERE current_job_id = jid;
  DELETE FROM admin_states WHERE job_id = jid;
  DELETE FROM jobs WHERE id = jid;
END $$;