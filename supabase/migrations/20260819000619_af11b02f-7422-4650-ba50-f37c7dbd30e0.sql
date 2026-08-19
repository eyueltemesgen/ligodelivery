DROP POLICY IF EXISTS media_public_read ON storage.objects;
CREATE POLICY media_public_read ON storage.objects FOR SELECT TO public
USING (bucket_id = 'ligo-media' AND (storage.foldername(name))[1] = ANY (ARRAY['categories','shops','products','offers','banners','branding']));