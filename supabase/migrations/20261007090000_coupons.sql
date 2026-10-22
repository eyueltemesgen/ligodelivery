-- Reconstruct `public.coupons`, `orders.coupon_id`/`coupon_code` and the
-- `check_coupon` RPC, none of which any earlier migration creates.
--
-- Like the storage buckets, these were made by hand in the Lovable dashboard and
-- never captured in SQL, so a project built from the migrations is missing them.
-- The consequence is worse than a broken image: `place_order` lists `coupon_id`
-- and `coupon_code` in an unconditional INSERT, so on a migrated database **every
-- checkout fails** with `column "coupon_id" of relation "orders" does not exist`.
-- The promo box in checkout calls the missing `check_coupon` RPC, so applying a
-- code would fail too, and the admin Marketing tab cannot list or create codes.
--
-- Column names and types are taken from the live project (probed through
-- PostgREST) and cross-checked against the generated `types.ts`, so this
-- matches what the app already expects rather than a guess.
--
-- Idempotent: safe to apply to the live project, which already has all of this.

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text,
  -- 'percent' | 'fixed' | 'free_delivery' — the three the admin UI offers.
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  usage_limit int,
  used_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A code is looked up case-insensitively (`upper(code) = upper(...)`), so the
-- uniqueness constraint has to be on the folded value or two codes differing
-- only in case would both apply.
--
-- Guarded rather than created outright: this migration also runs against the
-- live project, where the table already exists with rows this repo cannot read
-- (RLS hides them). If any two codes already collide case-insensitively, a bare
-- `CREATE UNIQUE INDEX` would abort the whole migration mid-cutover. Skipping it
-- leaves the table usable and the collision is a data problem to fix in the
-- admin UI, not a deploy blocker.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.coupons GROUP BY upper(code) HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'coupons: case-insensitive duplicate codes exist; skipping the unique index';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_uidx ON public.coupons (upper(code));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (is_active) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Codes are not public: an anonymous visitor must not be able to enumerate them
-- and a customer must not be able to read the discount rules of a code they have
-- not applied. `check_coupon` is SECURITY DEFINER so the promo box still works.
DROP POLICY IF EXISTS coupons_admin_all ON public.coupons;
CREATE POLICY coupons_admin_all ON public.coupons FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS coupons_updated_at ON public.coupons;
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The two order columns the checkout writes.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;

-- Deliberately no FK from orders.coupon_id to coupons.id: a redeemed code may be
-- deleted from the admin UI, and the order must keep the historical record of
-- which code was used (`coupon_code` is the snapshot for exactly that reason).

-- ---------------------------------------------------------------------------
-- check_coupon: validate a code and price it, without leaking the coupon table
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because `coupons` is admin-only. The return shape is what
-- checkout.tsx reads: `{valid, reason, message, code?, discount?}`.
--
-- `reason` is a stable machine code the client maps to a translation key;
-- `message` is an English sentence used only when the client does not know the
-- reason (an older app build, or a reason added later). Both are returned
-- because checkout.tsx renders `message` directly today: returning only a code
-- would have shown users literal `promo_invalid` text, and returning only
-- English would leave the toast untranslated in Amharic and Afaan Oromoo.
CREATE OR REPLACE FUNCTION public.check_coupon(
  p_code text,
  p_subtotal numeric,
  p_delivery_fee numeric DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.coupons;
  v_subtotal numeric := GREATEST(COALESCE(p_subtotal, 0), 0);
  v_fee numeric := GREATEST(COALESCE(p_delivery_fee, 0), 0);
  v_discount numeric := 0;
BEGIN
  IF NULLIF(btrim(COALESCE(p_code, '')), '') IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'empty', 'message', 'Enter a promo code');
  END IF;

  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(btrim(p_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid', 'message', 'That promo code is not valid');
  END IF;
  IF NOT c.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid', 'message', 'That promo code is not valid');
  END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_started', 'message', 'That promo code is not active yet');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired', 'message', 'That promo code has expired');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'exhausted', 'message', 'That promo code has been fully used');
  END IF;
  IF v_subtotal < c.min_order_amount THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'min_order', 'message', 'Your order is below this promo minimum');
  END IF;

  -- Mirrors the arithmetic in place_order exactly, so the price shown at
  -- checkout is the price charged.
  IF c.discount_type = 'percent' THEN
    v_discount := ROUND(v_subtotal * LEAST(c.discount_value, 100) / 100);
  ELSIF c.discount_type = 'fixed' THEN
    v_discount := LEAST(c.discount_value, v_subtotal);
  ELSE
    v_discount := v_fee;
  END IF;
  IF c.max_discount IS NOT NULL THEN
    v_discount := LEAST(v_discount, c.max_discount);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'reason', 'ok',
    'message', 'Promo applied',
    'code', c.code,
    'discount', GREATEST(v_discount, 0)
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.check_coupon(text, numeric, numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_coupon(text, numeric, numeric) TO authenticated;
