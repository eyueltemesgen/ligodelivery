-- Verified Ratings & Reviews for shops and products.
--
-- The marketplace shipped with a static `shops.rating numeric(2,1) DEFAULT 4.5`
-- that no customer could influence, and `products` had no rating at all. This
-- adds one order-scoped `reviews` table covering both shops (product_id NULL)
-- and products (product_id set), gated on a delivered order the reviewer owns
-- (verified purchase). Writes go through SECURITY DEFINER RPCs so a customer
-- cannot forge a review for an order they do not own and cannot mutate the
-- aggregate columns directly.
--
-- Additive and idempotent. Apply before deploying the matching app build; the
-- storefront degrades gracefully if it runs first (aggregate columns absent).
--
-- Fallback choice: `shops.rating` keeps its existing seeded value until the
-- shop's first real review, so shops without reviews do not suddenly read 0.
-- `products.rating` starts at 0 and the UI hides it until rating_count > 0.

-- ---------------------------------------------------------------------------
-- 1. Aggregate columns (denormalised so the storefront read path needs no join)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count int NOT NULL DEFAULT 0;

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS rating_count int NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. reviews table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One product review per order line, one shop review per order.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_product_uidx
  ON public.reviews(order_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_shop_uidx
  ON public.reviews(order_id) WHERE product_id IS NULL;

CREATE INDEX IF NOT EXISTS reviews_shop_idx ON public.reviews(shop_id);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS reviews_customer_idx ON public.reviews(customer_id);

-- Reads are public (visible rows only); writes only through the RPCs below, so
-- authenticated is deliberately not granted INSERT/UPDATE/DELETE.
REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
-- Two policies so anon never evaluates is_admin() (it is revoked from anon and
-- would raise "permission denied for function" while scanning hidden rows).
DROP POLICY IF EXISTS reviews_select ON public.reviews;
DROP POLICY IF EXISTS reviews_select_anon ON public.reviews;
DROP POLICY IF EXISTS reviews_select_auth ON public.reviews;
CREATE POLICY reviews_select_anon ON public.reviews FOR SELECT TO anon
  USING (NOT is_hidden);
CREATE POLICY reviews_select_auth ON public.reviews FOR SELECT TO authenticated
  USING (NOT is_hidden OR customer_id = auth.uid() OR public.is_admin());

DROP TRIGGER IF EXISTS reviews_updated ON public.reviews;
CREATE TRIGGER reviews_updated BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. Aggregate recompute: keep shops/products rating + rating_count in sync
--    with non-hidden reviews. Only touches shops/products, so no recursion.
-- ---------------------------------------------------------------------------
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

  -- Shops keep their seeded rating until the first real review. Only
  -- shop-level reviews (product_id NULL) count, so the aggregate matches the
  -- review list rendered on the shop page.
  UPDATE public.shops s SET
    rating_count = (SELECT COUNT(*)::int FROM public.reviews r
                    WHERE r.shop_id = s.id AND r.product_id IS NULL AND NOT r.is_hidden),
    rating = COALESCE(
      (SELECT AVG(r.rating)::numeric(2,1) FROM public.reviews r
       WHERE r.shop_id = s.id AND r.product_id IS NULL AND NOT r.is_hidden),
      s.rating)
  WHERE s.id = ANY(_shops);

  -- Products start at 0 and the UI hides the value until rating_count > 0.
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

DROP TRIGGER IF EXISTS reviews_aggregate ON public.reviews;
CREATE TRIGGER reviews_aggregate AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_recompute_aggregates();

-- ---------------------------------------------------------------------------
-- 4. submit_review: verified-purchase upsert of one review per line.
--    Parameter order differs from the plan sketch because Postgres requires
--    defaulted parameters to follow non-defaulted ones.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_review(
  _order_id uuid,
  _rating int,
  _comment text DEFAULT NULL,
  _product_id uuid DEFAULT NULL
)
RETURNS public.reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order public.orders;
  _review public.reviews;
  _comment_clean text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to leave a review'; END IF;
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF _order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only review your own orders';
  END IF;
  IF _order.status <> 'delivered' THEN
    RAISE EXCEPTION 'You can only review delivered orders';
  END IF;

  IF _product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order_id AND oi.product_id = _product_id
  ) THEN
    RAISE EXCEPTION 'That item is not part of this order';
  END IF;

  _comment_clean := NULLIF(btrim(COALESCE(_comment, '')), '');

  IF _product_id IS NULL THEN
    INSERT INTO public.reviews (order_id, customer_id, shop_id, product_id, rating, comment)
    VALUES (_order_id, auth.uid(), _order.shop_id, NULL, _rating, _comment_clean)
    ON CONFLICT (order_id) WHERE product_id IS NULL
    DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment,
                  updated_at = now()
    RETURNING * INTO _review;
  ELSE
    INSERT INTO public.reviews (order_id, customer_id, shop_id, product_id, rating, comment)
    VALUES (_order_id, auth.uid(), _order.shop_id, _product_id, _rating, _comment_clean)
    ON CONFLICT (order_id, product_id) WHERE product_id IS NOT NULL
    DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment,
                  updated_at = now()
    RETURNING * INTO _review;
  END IF;

  RETURN _review;
END; $$;
REVOKE ALL ON FUNCTION public.submit_review(uuid, int, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_review(uuid, int, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. set_review_hidden: admin moderation (hide / restore).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_review_hidden(_review_id uuid, _hidden boolean)
RETURNS public.reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _review public.reviews;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins can moderate reviews'; END IF;
  UPDATE public.reviews SET is_hidden = COALESCE(_hidden, true), updated_at = now()
  WHERE id = _review_id
  RETURNING * INTO _review;
  IF _review.id IS NULL THEN RAISE EXCEPTION 'Review not found'; END IF;
  RETURN _review;
END; $$;
REVOKE ALL ON FUNCTION public.set_review_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_review_hidden(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. rider_ratings: allow the customer to update their one rating per order
--    (the table only had INSERT before, so a re-rate would error). Additive:
--    the unique constraint on order_id already guarantees one row per order.
-- ---------------------------------------------------------------------------
GRANT UPDATE ON public.rider_ratings TO authenticated;
DROP POLICY IF EXISTS rider_ratings_update_customer ON public.rider_ratings;
CREATE POLICY rider_ratings_update_customer ON public.rider_ratings FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
