ALTER PUBLICATION supabase_realtime ADD TABLE public.technicians;
ALTER TABLE public.technicians REPLICA IDENTITY FULL;