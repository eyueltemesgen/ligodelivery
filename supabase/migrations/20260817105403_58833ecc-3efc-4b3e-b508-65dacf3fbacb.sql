DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "media_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "media_admin_update" ON storage.objects;

CREATE POLICY "media_public_read" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'ligo-media'
  AND (storage.foldername(name))[1] IN ('categories','shops','products','offers')
);

CREATE POLICY "media_owner_avatar_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'ligo-media'
  AND (
    is_admin()
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
);

CREATE POLICY "media_admin_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ligo-media'
  AND (
    is_admin()
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
);

CREATE POLICY "media_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'ligo-media'
  AND (
    is_admin()
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'ligo-media'
  AND (
    is_admin()
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
  )
);