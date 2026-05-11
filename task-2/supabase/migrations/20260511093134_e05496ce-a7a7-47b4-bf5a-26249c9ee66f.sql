DROP POLICY IF EXISTS authenticated_user_scoped_topics ON realtime.messages;

CREATE POLICY authenticated_user_scoped_topics
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE (auth.uid()::text || ':%')
  OR realtime.topic() LIKE ('%:' || auth.uid()::text)
  OR realtime.topic() LIKE ('%:' || auth.uid()::text || ':%')
  OR realtime.topic() = auth.uid()::text
);