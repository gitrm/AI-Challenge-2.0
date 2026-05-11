
-- 1. Gallery: require attendee status to upload
DROP POLICY IF EXISTS gallery_self_insert ON public.gallery_photos;
CREATE POLICY gallery_self_insert ON public.gallery_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.rsvps r
      WHERE r.event_id = gallery_photos.event_id
        AND r.user_id = auth.uid()
        AND r.status = 'going'
    )
  );

-- 2. Realtime: require authentication to subscribe to any topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_can_read_messages" ON realtime.messages;
CREATE POLICY "authenticated_can_read_messages" ON realtime.messages
  FOR SELECT TO authenticated
  USING (true);

-- 3. Exclude cancelled RSVPs from host email export
CREATE OR REPLACE FUNCTION public.host_get_attendee_emails(p_event_id uuid)
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_host uuid;
begin
  select host_id into v_host from public.events where id = p_event_id;
  if v_host is null then
    return;
  end if;
  if not public.is_member(v_host) then
    raise exception 'not authorized';
  end if;
  return query
    select r.user_id, u.email::text
    from public.rsvps r
    join auth.users u on u.id = r.user_id
    where r.event_id = p_event_id
      and r.status in ('going','waitlist');
end; $function$;
