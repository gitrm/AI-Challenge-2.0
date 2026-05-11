-- 1) Remove leftover public-read storage policy on gallery bucket
DROP POLICY IF EXISTS "Public read gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public read gallery photos" ON storage.objects;
DROP POLICY IF EXISTS "gallery_public_read" ON storage.objects;

-- 2) Restrict hosts SELECT: anon sees public columns only; authenticated sees all
DROP POLICY IF EXISTS hosts_read ON public.hosts;

CREATE POLICY hosts_read_authenticated
ON public.hosts
FOR SELECT
TO authenticated
USING (true);

-- Revoke broad column grants to anon, then grant only safe columns
REVOKE SELECT ON public.hosts FROM anon;
GRANT SELECT (id, name, slug, logo_url, bio, created_by, created_at) ON public.hosts TO anon;

CREATE POLICY hosts_read_anon_public_columns
ON public.hosts
FOR SELECT
TO anon
USING (true);