-- Customer Account Center — additive, non-destructive schema changes.
--
-- Adds the data structures the account experience needs without touching any
-- existing table's meaning or dropping customer/order/shop/product data:
--   1. addresses: city / area / updated_at columns for the Bishoftu address model
--   2. addresses: exactly one default address per customer (enforced by trigger)
--   3. wishlist: saved products per customer
--   4. shop_favorites: saved shops per customer
--
-- Everything is idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) so it can be
-- re-applied safely. RLS mirrors the existing addresses_own policy: a customer
-- can only ever see and mutate their own rows; admins can read for support.

-- 1. Address fields -----------------------------------------------------------
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Bishoftu',
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS addresses_updated ON public.addresses;
CREATE TRIGGER addresses_updated BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS addresses_user_idx ON public.addresses(user_id);

-- 2. One default address per customer -----------------------------------------
CREATE OR REPLACE FUNCTION public.addresses_enforce_single_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.addresses
       SET is_default = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_default;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.addresses_enforce_single_default() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS addresses_single_default ON public.addresses;
CREATE TRIGGER addresses_single_default BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.addresses_enforce_single_default();

-- 3. Saved products (wishlist) ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS wishlist_user_idx ON public.wishlist(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wishlist_own ON public.wishlist;
CREATE POLICY wishlist_own ON public.wishlist FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());

-- 4. Favorite shops -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_id)
);
CREATE INDEX IF NOT EXISTS shop_favorites_user_idx ON public.shop_favorites(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_favorites TO authenticated;
GRANT ALL ON public.shop_favorites TO service_role;
ALTER TABLE public.shop_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shop_favorites_own ON public.shop_favorites;
CREATE POLICY shop_favorites_own ON public.shop_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());
