DROP POLICY IF EXISTS events_read_published ON public.events;

CREATE POLICY events_read_published ON public.events
FOR SELECT
USING (
  (status = 'published' AND visibility = 'public')
  OR public.is_member(host_id)
);