
-- 1) Restrict hosts.contact_email to authenticated users only (column-level)
REVOKE SELECT ON public.hosts FROM anon;
GRANT SELECT (id, name, slug, bio, logo_url, created_by, created_at) ON public.hosts TO anon;
GRANT SELECT ON public.hosts TO authenticated;

-- 2) Make gallery bucket private
UPDATE storage.buckets SET public = false WHERE id = 'gallery';

-- Drop any pre-existing gallery storage policies we manage
DROP POLICY IF EXISTS "gallery_public_read" ON storage.objects;
DROP POLICY IF EXISTS "gallery_read_approved_or_owner_or_host" ON storage.objects;
DROP POLICY IF EXISTS "gallery_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "gallery_host_delete" ON storage.objects;

-- Read: only approved photos, uploader, or host team member
CREATE POLICY "gallery_read_approved_or_owner_or_host"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'gallery'
  AND EXISTS (
    SELECT 1 FROM public.gallery_photos gp
    WHERE (
      gp.image_url = storage.objects.name
      OR gp.image_url LIKE '%/' || storage.objects.name
      OR gp.image_url LIKE '%' || storage.objects.name
    )
    AND (
      gp.status = 'approved'
      OR gp.user_id = auth.uid()
      OR public.is_member((SELECT host_id FROM public.events WHERE id = gp.event_id))
    )
  )
);

-- Insert: authenticated user can upload to their own folder under event/user
CREATE POLICY "gallery_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Delete: host team can delete files
CREATE POLICY "gallery_host_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gallery'
  AND EXISTS (
    SELECT 1 FROM public.gallery_photos gp
    WHERE (gp.image_url = storage.objects.name OR gp.image_url LIKE '%' || storage.objects.name)
      AND public.is_member((SELECT host_id FROM public.events WHERE id = gp.event_id))
  )
);
