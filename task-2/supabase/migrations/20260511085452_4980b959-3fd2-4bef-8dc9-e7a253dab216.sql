
-- 1. Lock down compute_event_stats
CREATE OR REPLACE FUNCTION public.compute_event_stats(p_event_id uuid)
 RETURNS TABLE(event_id uuid, going_count bigint, waitlist_count bigint, checked_in_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND (e.status = 'published' OR public.is_member(e.host_id))
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p_event_id,
    count(*) FILTER (WHERE r.status = 'going')::bigint,
    count(*) FILTER (WHERE r.status = 'waitlist')::bigint,
    count(*) FILTER (WHERE r.status = 'going' AND ci.id IS NOT NULL AND ci.undone = false)::bigint
  FROM public.rsvps r
  LEFT JOIN public.check_ins ci ON ci.rsvp_id = r.id
  WHERE r.event_id = p_event_id;
END;
$function$;

-- 2. Online URL: serve via attendee-only RPC, revoke column from regular reads
CREATE OR REPLACE FUNCTION public.get_event_online_url(p_event_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
  v_host uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT online_url, host_id INTO v_url, v_host
  FROM public.events
  WHERE id = p_event_id AND status = 'published';

  IF v_url IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.is_member(v_host) THEN
    RETURN v_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rsvps
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
      AND status = 'going'
  ) THEN
    RETURN v_url;
  END IF;

  RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_online_url(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_event_online_url(uuid) FROM anon, public;

-- Revoke column-level read on online_url from regular roles. Hosts read via is_member RLS already passes,
-- but RLS does not bypass column privileges - so hosts need column access too. Grant to a definer RPC instead.
REVOKE SELECT (online_url) ON public.events FROM anon, authenticated;

-- Provide hosts a way to read online_url for their own events (used in editor)
CREATE OR REPLACE FUNCTION public.host_get_event_online_url(p_event_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
  v_host uuid;
BEGIN
  SELECT online_url, host_id INTO v_url, v_host
  FROM public.events WHERE id = p_event_id;
  IF v_host IS NULL OR NOT public.is_member(v_host) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN v_url;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.host_get_event_online_url(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.host_get_event_online_url(uuid) FROM anon, public;

-- 3. Tighten realtime.messages policy to topics scoped to the user's own uid
DROP POLICY IF EXISTS "authenticated_can_read_messages" ON realtime.messages;
CREATE POLICY "authenticated_user_scoped_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);
