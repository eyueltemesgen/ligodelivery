-- Create the two storage buckets the app signs URLs from.
--
-- No earlier migration ever created them: they were made by hand in the Lovable
-- project's dashboard, so the `storage.objects` policies that reference
-- `bucket_id = 'ligo-media'` / `'ligo-proofs'` were simply inert everywhere else.
-- A fresh Supabase project therefore came up with policies but no buckets, and
-- every upload failed with "Bucket not found" while every image 404'd.
--
-- Both buckets are **private** (`public = false`): the app only ever reads
-- through time-limited signed URLs (`createSignedUrls` in `src/lib/media.tsx`),
-- and a public bucket would expose customer payment proofs to anyone who can
-- guess a path. Do not flip these to public.
--
-- Idempotent: `ON CONFLICT DO NOTHING` leaves an existing bucket's settings
-- (size limit, MIME allow-list) exactly as an admin configured them.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('ligo-media', 'ligo-media', false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml']),
  ('ligo-proofs', 'ligo-proofs', false, 10485760,
   ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;
