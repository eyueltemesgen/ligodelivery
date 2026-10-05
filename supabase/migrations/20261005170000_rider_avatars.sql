-- Rider avatars on the live map.
--
-- The customer order page shows the rider's photo on the tracking map, but the
-- rider's photo lives on `profiles.avatar_url` while the map row comes from
-- `riders`. Customers cannot read other people's `profiles` rows (RLS is
-- self-or-admin only), so copy the avatar onto `riders` and keep it in sync.
-- Also allow authenticated users to read avatar objects, otherwise the signed
-- URL for the rider's photo cannot be created.
--
-- Additive and idempotent.

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Backfill from profiles, then keep the two in step on every profile change.
UPDATE public.riders r
SET avatar_url = p.avatar_url
FROM public.profiles p
WHERE p.id = r.id
  AND r.avatar_url IS DISTINCT FROM p.avatar_url;

CREATE OR REPLACE FUNCTION public.sync_rider_avatar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.riders
  SET avatar_url = NEW.avatar_url
  WHERE id = NEW.id
    AND avatar_url IS DISTINCT FROM NEW.avatar_url;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_sync_rider_avatar ON public.profiles;
CREATE TRIGGER profiles_sync_rider_avatar
  AFTER INSERT OR UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_rider_avatar();

-- Avatars are profile photos shown to customers tracking their order, so any
-- signed-in user may read them (writes stay owner/admin-only).
DROP POLICY IF EXISTS "media_avatar_read" ON storage.objects;
CREATE POLICY "media_avatar_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ligo-media'
    AND (storage.foldername(name))[1] = 'avatars'
  );
