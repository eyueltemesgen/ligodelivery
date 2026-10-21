-- Stop advertising a shop rating nobody earned.
--
-- The marketplace shipped with `shops.rating numeric(2,1) NOT NULL DEFAULT 4.5`,
-- a placeholder no customer could influence. 20261005150000_reviews.sql added
-- the real `reviews` table and aggregates, but deliberately kept the seeded
-- value as a fallback so unreviewed shops would not drop to 0:
--
--   rating = COALESCE((SELECT AVG(...)), s.rating)
--
-- That was reasonable while reviews were empty. It is not now. On the live
-- database 6 of 7 shops display "4.5" from `rating_count = 0` -- a rating no
-- customer ever gave. That is the single most damaging thing on the storefront:
-- a competitor cannot beat us on price alone, but a customer who discovers the
-- stars are fake stops believing everything else on the page, and the reviews
-- we just shipped lose their value.
--
-- It also corrupts ranking. `queries.ts` and the assistant both order by
-- `rating DESC`, so the fabricated constant sorted unreviewed shops above a
-- shop with a real (lower) average -- punishing the shops that actually earned
-- reviews. Ordering now carries a `rating_count DESC` tiebreaker, and this
-- migration makes the stored value honest so the first sort key means something.
--
-- Additive and idempotent.

-- ---------------------------------------------------------------------------
-- 1. Clear the unearned placeholder
-- ---------------------------------------------------------------------------
-- Only touches shops with no reviews; a shop with real reviews keeps the
-- average the aggregate trigger computed for it.
UPDATE public.shops
SET rating = 0
WHERE rating_count = 0
  AND rating <> 0;

-- ---------------------------------------------------------------------------
-- 2. New shops start unrated, like products already do
-- ---------------------------------------------------------------------------
ALTER TABLE public.shops
  ALTER COLUMN rating SET DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3. Do not resurrect the placeholder when the last review is deleted
-- ---------------------------------------------------------------------------
-- `COALESCE(avg, s.rating)` kept whatever value the row held. With the seed
-- gone that would preserve a stale average forever after a shop's reviews were
-- removed. Products already fall back to 0; shops now match.
CREATE OR REPLACE FUNCTION public.reviews_recompute_aggregates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _shops uuid[] := ARRAY[]::uuid[];
  _products uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP <> 'DELETE' THEN
    _shops := _shops || NEW.shop_id;
    IF NEW.product_id IS NOT NULL THEN _products := _products || NEW.product_id; END IF;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    _shops := _shops || OLD.shop_id;
    IF OLD.product_id IS NOT NULL THEN _products := _products || OLD.product_id; END IF;
  END IF;

  -- A shop with no visible reviews reads 0, and the UI renders that as "New"
  -- rather than a number, so an unrated shop is honest instead of flattering.
  -- Only shop-level reviews (product_id NULL) count, so the aggregate matches
  -- the review list rendered on the shop page.
  UPDATE public.shops s SET
    rating_count = (SELECT COUNT(*)::int FROM public.reviews r
                    WHERE r.shop_id = s.id AND r.product_id IS NULL AND NOT r.is_hidden),
    rating = COALESCE(
      (SELECT AVG(r.rating)::numeric(2,1) FROM public.reviews r
       WHERE r.shop_id = s.id AND r.product_id IS NULL AND NOT r.is_hidden),
      0)
  WHERE s.id = ANY(_shops);

  UPDATE public.products p SET
    rating_count = (SELECT COUNT(*)::int FROM public.reviews r
                    WHERE r.product_id = p.id AND NOT r.is_hidden),
    rating = COALESCE(
      (SELECT AVG(r.rating)::numeric(2,1) FROM public.reviews r
       WHERE r.product_id = p.id AND NOT r.is_hidden),
      0)
  WHERE p.id = ANY(_products);

  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.reviews_recompute_aggregates() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Index the new sort
-- ---------------------------------------------------------------------------
-- The storefront sorts by (is_featured, rating, rating_count). The existing
-- index in 20261004190000_performance_indexes.sql stops at `rating`, so the
-- added tiebreaker would fall back to a sort. Cheap to keep aligned.
CREATE INDEX IF NOT EXISTS shops_ranking_idx
  ON public.shops (is_active, is_featured DESC, rating DESC, rating_count DESC);
