DROP POLICY IF EXISTS rsvps_self_update ON public.rsvps;

DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());