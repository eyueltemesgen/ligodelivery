
CREATE POLICY "media_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'ligo-media');
CREATE POLICY "media_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ligo-media' AND (public.is_admin() OR (storage.foldername(name))[1] = 'avatars'));
CREATE POLICY "media_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ligo-media' AND (public.is_admin() OR (storage.foldername(name))[1] = 'avatars'));
CREATE POLICY "media_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ligo-media' AND public.is_admin());

CREATE POLICY "proofs_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ligo-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY "proofs_owner_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ligo-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
