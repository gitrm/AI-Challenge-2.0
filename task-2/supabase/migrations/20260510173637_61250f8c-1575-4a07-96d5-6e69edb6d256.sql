-- Re-randomize demo host and event IDs.
-- Strategy: insert mapping rows, then update PK + all FK references in a single statement using CTEs.

DO $$
DECLARE
  r RECORD;
  new_id uuid;
BEGIN
  -- Hosts
  FOR r IN SELECT id FROM hosts WHERE id::text LIKE 'h0000%' LOOP
    new_id := gen_random_uuid();
    UPDATE events         SET host_id = new_id WHERE host_id = r.id;
    UPDATE host_members   SET host_id = new_id WHERE host_id = r.id;
    UPDATE host_invites   SET host_id = new_id WHERE host_id = r.id;
    UPDATE hosts          SET id      = new_id WHERE id      = r.id;
  END LOOP;

  -- Events
  FOR r IN SELECT id FROM events WHERE id::text LIKE 'e0000%' LOOP
    new_id := gen_random_uuid();
    UPDATE rsvps          SET event_id = new_id WHERE event_id = r.id;
    UPDATE gallery_photos SET event_id = new_id WHERE event_id = r.id;
    UPDATE feedback       SET event_id = new_id WHERE event_id = r.id;
    UPDATE events         SET id       = new_id WHERE id       = r.id;
  END LOOP;
END $$;