DROP POLICY IF EXISTS fb_read_author_host_or_attendee ON public.feedback;

CREATE POLICY fb_read_author_host_or_attendee
ON public.feedback
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_member((
    SELECT e.host_id
    FROM public.events e
    WHERE e.id = feedback.event_id
  ))
  OR EXISTS (
    SELECT 1
    FROM public.rsvps r
    WHERE r.event_id = feedback.event_id
      AND r.user_id = auth.uid()
      AND r.status = 'going'::public.rsvp_status
  )
);