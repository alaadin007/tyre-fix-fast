REVOKE ALL ON FUNCTION public.is_own_technician_folder(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_technician_folder(text) TO authenticated, service_role;