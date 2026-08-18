-- ADMIN STATES
DROP POLICY IF EXISTS "Anyone can view admin_states" ON public.admin_states;
DROP POLICY IF EXISTS "Anyone can insert admin_states" ON public.admin_states;
DROP POLICY IF EXISTS "Anyone can update admin_states" ON public.admin_states;
DROP POLICY IF EXISTS "Anyone can delete admin_states" ON public.admin_states;
CREATE POLICY "Admins manage admin_states" ON public.admin_states FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.admin_states FROM anon;
GRANT ALL ON public.admin_states TO service_role;

-- APP SETTINGS
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can update app settings" ON public.app_settings;
CREATE POLICY "Admins manage app_settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.app_settings FROM anon;
GRANT ALL ON public.app_settings TO service_role;

-- CONVERSATIONS
DROP POLICY IF EXISTS "Anyone can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON public.conversations;
CREATE POLICY "Admins view conversations" ON public.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.conversations FROM anon;
GRANT ALL ON public.conversations TO service_role;

-- CUSTOMERS
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.customers FROM anon;
GRANT ALL ON public.customers TO service_role;

-- JOB ALLOCATIONS
DROP POLICY IF EXISTS "Anyone can view allocations" ON public.job_allocations;
DROP POLICY IF EXISTS "Anyone can insert allocations" ON public.job_allocations;
DROP POLICY IF EXISTS "Anyone can update allocations" ON public.job_allocations;
CREATE POLICY "Admins manage allocations" ON public.job_allocations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Technicians view own allocations" ON public.job_allocations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = job_allocations.technician_id AND t.user_id = auth.uid()));
REVOKE ALL ON public.job_allocations FROM anon;
GRANT ALL ON public.job_allocations TO service_role;

-- OPS ALERTS
DROP POLICY IF EXISTS "Anyone can view ops_alerts" ON public.ops_alerts;
DROP POLICY IF EXISTS "Anyone can insert ops_alerts" ON public.ops_alerts;
DROP POLICY IF EXISTS "Anyone can update ops_alerts" ON public.ops_alerts;
CREATE POLICY "Admins manage ops_alerts" ON public.ops_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.ops_alerts FROM anon;
GRANT ALL ON public.ops_alerts TO service_role;

-- PENDING ADMIN ACTIONS
DROP POLICY IF EXISTS "Authenticated can manage pending_admin_actions" ON public.pending_admin_actions;
CREATE POLICY "Admins manage pending_admin_actions" ON public.pending_admin_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.pending_admin_actions FROM anon;

-- QUOTES
DROP POLICY IF EXISTS "Anyone can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can update quotes" ON public.quotes;
CREATE POLICY "Admins manage quotes" ON public.quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Technicians view own quotes" ON public.quotes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.technicians t WHERE t.id = quotes.technician_id AND t.user_id = auth.uid()));
REVOKE ALL ON public.quotes FROM anon;
GRANT ALL ON public.quotes TO service_role;

-- REVIEWS
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.reviews FROM anon;
GRANT ALL ON public.reviews TO service_role;

-- SCHEDULED TASKS
DROP POLICY IF EXISTS "Anyone can view scheduled_tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Anyone can insert scheduled_tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Anyone can update scheduled_tasks" ON public.scheduled_tasks;
CREATE POLICY "Admins view scheduled_tasks" ON public.scheduled_tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.scheduled_tasks FROM anon;
GRANT ALL ON public.scheduled_tasks TO service_role;

-- SHORT LINKS
DROP POLICY IF EXISTS "public read short links" ON public.short_links;
CREATE POLICY "Admins view short_links" ON public.short_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.short_links FROM anon;
REVOKE ALL ON public.short_links FROM authenticated;
GRANT SELECT ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;

-- SMS MESSAGES
DROP POLICY IF EXISTS "Anyone can view sms" ON public.sms_messages;
DROP POLICY IF EXISTS "Anyone can insert sms" ON public.sms_messages;
CREATE POLICY "Admins view sms_messages" ON public.sms_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.sms_messages FROM anon;
GRANT ALL ON public.sms_messages TO service_role;

-- TECHNICIANS
DROP POLICY IF EXISTS "Public can insert technicians from admin" ON public.technicians;
DROP POLICY IF EXISTS "Public can update technicians from admin" ON public.technicians;
DROP POLICY IF EXISTS "Public can view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Technicians can update own row" ON public.technicians;
CREATE POLICY "Technicians can update own row" ON public.technicians FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.technicians FROM anon;
GRANT ALL ON public.technicians TO service_role;

-- Prevent non-admin self-approval / privilege fields being changed by the technician
CREATE OR REPLACE FUNCTION public.guard_technician_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.approval_status := OLD.approval_status;
    NEW.approved_at := OLD.approved_at;
    NEW.rejected_reason := OLD.rejected_reason;
    NEW.active := OLD.active;
    NEW.rating := OLD.rating;
    NEW.jobs_completed := OLD.jobs_completed;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_technician_privileged_fields ON public.technicians;
CREATE TRIGGER trg_guard_technician_privileged_fields
BEFORE UPDATE ON public.technicians
FOR EACH ROW EXECUTE FUNCTION public.guard_technician_privileged_fields();

-- Lock down SECURITY DEFINER functions from anonymous execution
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_technician_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_dispatch_agent() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_notify_new_tech_application() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_notify_tech_status_change() FROM PUBLIC, anon, authenticated;