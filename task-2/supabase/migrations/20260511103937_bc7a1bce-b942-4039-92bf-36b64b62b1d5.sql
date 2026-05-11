-- 1) Revoke column-level SELECT on hosts.contact_email from anon (and public) to prevent enumeration
REVOKE SELECT (contact_email) ON public.hosts FROM anon;
REVOKE SELECT (contact_email) ON public.hosts FROM PUBLIC;

-- 2) Tighten realtime topic policy: require topic to END with ":<auth.uid()>"
-- This matches the application's actual channels: tickets:<uid> and rsvps:<eventId>:<uid>
DROP POLICY IF EXISTS authenticated_user_scoped_topics ON realtime.messages;

CREATE POLICY authenticated_user_scoped_topics
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE ('%:' || auth.uid()::text)
);
