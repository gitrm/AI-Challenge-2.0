
-- Recreate event_stats backed by a SECURITY DEFINER helper so counts are
-- accurate for any caller (the previous security_invoker view collapsed counts
-- to 0 for non-host viewers because rsvps RLS hid other users' rows).
DROP VIEW IF EXISTS public.event_stats;

CREATE OR REPLACE FUNCTION public.compute_event_stats(p_event_id uuid)
RETURNS TABLE (
  event_id uuid,
  going_count bigint,
  waitlist_count bigint,
  checked_in_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_event_id,
    count(*) FILTER (WHERE r.status = 'going')::bigint,
    count(*) FILTER (WHERE r.status = 'waitlist')::bigint,
    count(*) FILTER (WHERE r.status = 'going' AND ci.id IS NOT NULL AND ci.undone = false)::bigint
  FROM public.rsvps r
  LEFT JOIN public.check_ins ci ON ci.rsvp_id = r.id
  WHERE r.event_id = p_event_id;
$$;

REVOKE ALL ON FUNCTION public.compute_event_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_event_stats(uuid) TO anon, authenticated;

CREATE VIEW public.event_stats
WITH (security_invoker = on) AS
SELECT s.event_id, s.going_count, s.waitlist_count, s.checked_in_count
FROM public.events e
CROSS JOIN LATERAL public.compute_event_stats(e.id) s;

GRANT SELECT ON public.event_stats TO anon, authenticated;
