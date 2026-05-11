CREATE OR REPLACE FUNCTION public.is_host(p_host uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.host_members
    WHERE host_id = p_host
      AND user_id = auth.uid()
      AND role = 'host'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_member(p_host uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.host_members
    WHERE host_id = p_host
      AND user_id = auth.uid()
  );
$function$;

DROP POLICY IF EXISTS fb_read_author_host_or_attendee ON public.feedback;

CREATE POLICY fb_read_author_host_or_attendee
ON public.feedback
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_member((
    SELECT events.host_id
    FROM public.events
    WHERE events.id = feedback.event_id
  ))
  OR EXISTS (
    SELECT 1
    FROM public.rsvps
    WHERE rsvps.event_id = feedback.event_id
      AND rsvps.user_id = auth.uid()
      AND rsvps.status = 'going'::public.rsvp_status
  )
);