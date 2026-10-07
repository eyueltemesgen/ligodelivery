-- Special Moments hero banners.
--
-- The Special Moments hub hero now renders a full-bleed image carousel
-- (`special_moments` banner placement) exactly like the homepage hero. Seed it
-- from the existing `home_hero` banners so the hero shows real imagery before an
-- admin curates a dedicated set. Additive and idempotent: the seed only runs
-- while no `special_moments` banner exists, so re-running never duplicates rows
-- or overwrites an admin's own selection.

INSERT INTO public.banners (title, subtitle, image_url, link_url, cta_label, placement, sort_order, is_active)
SELECT b.title, b.subtitle, b.image_url, b.link_url, b.cta_label, 'special_moments', b.sort_order, true
FROM public.banners b
WHERE b.placement = 'home_hero'
  AND b.is_active
  AND b.image_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.banners WHERE placement = 'special_moments')
ORDER BY b.sort_order;

-- The admin service-category uploader writes to `services/categories/...`, but
-- the storage read policy only allowed categories/shops/products/offers/banners/
-- branding/merchants. Objects under `services` were therefore unreadable (signed
-- URLs 404) and the upload was rejected. Allow the folder so service and
-- category imagery can be served.
DROP POLICY IF EXISTS media_public_read ON storage.objects;
CREATE POLICY media_public_read ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'ligo-media'
  AND (storage.foldername(name))[1] = ANY (ARRAY['categories','shops','products','offers','banners','branding','merchants','services'])
);
