-- Enable realtime for rsvps so users see waitlist promotions live
ALTER TABLE public.rsvps REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;