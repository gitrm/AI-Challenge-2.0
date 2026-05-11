
-- 1. Profiles: drop email column (PII leak via public read)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

-- 2. Host-only RPC to fetch attendee emails
CREATE OR REPLACE FUNCTION public.host_get_attendee_emails(p_event_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    where r.event_id = p_event_id;
end; $$;

REVOKE ALL ON FUNCTION public.host_get_attendee_emails(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.host_get_attendee_emails(uuid) TO authenticated;

-- 3. Feedback: tighten read + write
DROP POLICY IF EXISTS fb_self_read ON public.feedback;
DROP POLICY IF EXISTS fb_self_write ON public.feedback;

CREATE POLICY fb_read_author_or_host ON public.feedback
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_member((SELECT host_id FROM public.events WHERE id = feedback.event_id))
);

CREATE POLICY fb_insert_attendee ON public.feedback
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.rsvps
    WHERE event_id = feedback.event_id
      AND user_id = auth.uid()
      AND status = 'going'
  )
);

-- 4. Remove vestigial WITH CHECK false policies (inserts happen via SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS rsvps_self_insert ON public.rsvps;
DROP POLICY IF EXISTS hm_insert_via_invite ON public.host_members;

-- 5. Storage: path-scoped policies
DROP POLICY IF EXISTS "Auth upload gallery" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload event-covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload host-logos" ON storage.objects;

CREATE POLICY "Gallery upload own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'gallery'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Gallery delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'gallery'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Event-covers upload own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Event-covers update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Event-covers delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Host-logos upload own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'host-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Host-logos update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'host-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Host-logos delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'host-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Function search_path hardening
CREATE OR REPLACE FUNCTION public.is_host(p_host uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  select exists (
    select 1 from public.host_members
    where host_id=p_host and user_id=auth.uid() and role='host'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member(p_host uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  select exists (
    select 1 from public.host_members
    where host_id=p_host and user_id=auth.uid()
  );
$$;

-- 7. event_stats view: run as caller so RLS applies
ALTER VIEW public.event_stats SET (security_invoker = on);

-- 8. Lock SECURITY DEFINER RPCs to authenticated only
REVOKE ALL ON FUNCTION public.rsvp_to_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rsvp_to_event(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_rsvp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_rsvp(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;
