
DROP POLICY IF EXISTS fb_read_author_or_host ON public.feedback;

CREATE POLICY fb_read_author_host_or_attendee ON public.feedback
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_member((SELECT host_id FROM public.events WHERE id = feedback.event_id))
  OR EXISTS (
    SELECT 1 FROM public.rsvps
    WHERE event_id = feedback.event_id
      AND user_id = auth.uid()
      AND status = 'going'
  )
);
