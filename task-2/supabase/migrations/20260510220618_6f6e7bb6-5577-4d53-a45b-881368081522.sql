DROP POLICY IF EXISTS fb_read_author_host_or_attendee ON public.feedback;

CREATE POLICY fb_read_public
  ON public.feedback
  FOR SELECT
  TO anon, authenticated
  USING (true);