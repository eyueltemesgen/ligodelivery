-- Loyalty points + customer referral engine.
--
-- Purpose: the marketplace could acquire a customer but had no way to keep one
-- or to make one bring another. `grep -ri 'referral\|loyalty'` over src/ and the
-- migrations returned nothing, while the competing Bishoftu platforms grow on
-- word of mouth. This adds the two mechanics that cost nothing per order:
--
--   * Referrals  — every customer owns a code. When a referred customer's FIRST
--                  order is delivered, both sides are credited. Crediting on
--                  delivery (not on signup) is deliberate: it makes fake
--                  accounts worthless, since a payout requires a paid, completed
--                  delivery to a real address.
--   * Loyalty    — points earned on delivered order value, redeemable at
--                  checkout as a discount. Earned on delivery so an abandoned
--                  or refunded order never mints points.
--
-- Design notes:
--   * Money never comes from the client. Points-to-birr conversion, the minimum
--     redemption and the per-order cap are all resolved server-side inside
--     place_order, from `settings.loyalty`.
--   * Earning is attached to a trigger on `orders` (status -> 'delivered')
--     rather than to complete_delivery, so admin-driven and RPC-driven
--     completions are covered by one path and no existing RPC is redefined.
--   * Every balance change writes an immutable `loyalty_ledger` row, so the
--     balance is always auditable and grants are idempotent per order.
--
-- Additive and idempotent. The storefront degrades gracefully if it is not
-- applied: `src/lib/loyalty.ts` returns empty results and checkout falls back
-- to a points-free order.

-- ---------------------------------------------------------------------------
-- 1. Configuration (public read: the rates are shown in the UI, not secret)
-- ---------------------------------------------------------------------------
INSERT INTO public.settings (key, value, is_public)
VALUES (
  'loyalty',
  jsonb_build_object(
    'enabled', true,
    'earn_points_per_100_etb', 5,      -- 5 points per 100 ETB of order value
    'point_value_etb', 0.5,            -- 1 point = 0.50 ETB when redeemed
    'min_redeem_points', 100,          -- smallest redemption
    'max_redeem_percent', 20,          -- never more than 20% of an order
    'referrer_points', 100,            -- to the customer who shared the code
    'referee_points', 100,             -- to the new customer, on first delivery
    'welcome_points', 0                -- signup bonus; 0 keeps farming pointless
  ),
  true
)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Wallets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_wallets (
  user_id uuid PRIMARY KEY,
  points int NOT NULL DEFAULT 0 CHECK (points >= 0),
  lifetime_points int NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  referral_code text UNIQUE,
  referred_by uuid,
  referral_credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_wallets_referred_by_idx
  ON public.loyalty_wallets(referred_by) WHERE referred_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Immutable ledger — the audit trail behind every balance change
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN (
    'earn', 'redeem', 'referral_bonus', 'referral_welcome', 'signup_bonus', 'admin_adjust'
  )),
  points int NOT NULL,               -- positive credit, negative debit
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_ledger_user_idx
  ON public.loyalty_ledger(user_id, created_at DESC);

-- One grant of each kind per order per user: makes the delivered trigger
-- idempotent even if an order is re-saved as delivered.
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_ledger_order_kind_uidx
  ON public.loyalty_ledger(order_id, user_id, kind)
  WHERE order_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Config accessor — single source of truth for the rates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.loyalty_config()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', COALESCE((v->>'enabled')::boolean, true),
    'earn_points_per_100_etb', COALESCE((v->>'earn_points_per_100_etb')::numeric, 5),
    'point_value_etb', COALESCE((v->>'point_value_etb')::numeric, 0.5),
    'min_redeem_points', COALESCE((v->>'min_redeem_points')::int, 100),
    'max_redeem_percent', COALESCE((v->>'max_redeem_percent')::numeric, 20),
    'referrer_points', COALESCE((v->>'referrer_points')::int, 100),
    'referee_points', COALESCE((v->>'referee_points')::int, 100),
    'welcome_points', COALESCE((v->>'welcome_points')::int, 0)
  )
  FROM (SELECT COALESCE((SELECT value FROM public.settings WHERE key = 'loyalty'), '{}'::jsonb) AS v) s;
$$;

-- ---------------------------------------------------------------------------
-- 5. Referral codes
-- ---------------------------------------------------------------------------
-- Ambiguous glyphs (0/O, 1/I) are excluded so a code can be read aloud on the
-- phone or copied off a sticker without transcription errors.
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  tries int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..7 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.loyalty_wallets w WHERE w.referral_code = code);
    tries := tries + 1;
    IF tries > 50 THEN RAISE EXCEPTION 'Could not allocate a referral code'; END IF;
  END LOOP;
  RETURN code;
END; $$;

-- Create the wallet on demand. Idempotent, so it is safe to call from any read
-- path and from the signup trigger.
CREATE OR REPLACE FUNCTION public.ensure_loyalty_wallet(p_user_id uuid)
RETURNS public.loyalty_wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w public.loyalty_wallets;
BEGIN
  INSERT INTO public.loyalty_wallets (user_id, referral_code)
  VALUES (p_user_id, public.gen_referral_code())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO w FROM public.loyalty_wallets WHERE user_id = p_user_id;

  -- Repair a wallet whose code was never allocated (e.g. pre-existing row).
  IF w.referral_code IS NULL THEN
    UPDATE public.loyalty_wallets SET referral_code = public.gen_referral_code(), updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO w;
  END IF;

  RETURN w;
END; $$;

-- Backfill every existing account so nobody is left without a code.
INSERT INTO public.loyalty_wallets (user_id, referral_code)
SELECT p.id, public.gen_referral_code()
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_wallets w WHERE w.user_id = p.id);

UPDATE public.loyalty_wallets
SET referral_code = public.gen_referral_code()
WHERE referral_code IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Read RPCs (the UI never computes a balance from raw tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_loyalty()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  w public.loyalty_wallets;
  cfg jsonb := public.loyalty_config();
  v_invited int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  w := public.ensure_loyalty_wallet(v_uid);

  SELECT count(*) INTO v_invited
  FROM public.loyalty_wallets r WHERE r.referred_by = v_uid;

  RETURN jsonb_build_object(
    'enabled', (cfg->>'enabled')::boolean,
    'points', w.points,
    'lifetime_points', w.lifetime_points,
    'referral_code', w.referral_code,
    'referred_by', w.referred_by,
    'invited_count', v_invited,
    'point_value_etb', (cfg->>'point_value_etb')::numeric,
    'min_redeem_points', (cfg->>'min_redeem_points')::int,
    'max_redeem_percent', (cfg->>'max_redeem_percent')::numeric,
    'earn_points_per_100_etb', (cfg->>'earn_points_per_100_etb')::numeric,
    'referrer_points', (cfg->>'referrer_points')::int,
    'referee_points', (cfg->>'referee_points')::int
  );
END; $$;

CREATE OR REPLACE FUNCTION public.my_loyalty_ledger(p_limit int DEFAULT 50)
RETURNS SETOF public.loyalty_ledger
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.loyalty_ledger
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

-- Resolve a referral code to the user who owns it, without exposing the roster.
CREATE OR REPLACE FUNCTION public.loyalty_lookup_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.loyalty_wallets;
BEGIN
  SELECT * INTO w FROM public.loyalty_wallets
  WHERE referral_code = upper(btrim(COALESCE(p_code, '')));
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
  RETURN jsonb_build_object('valid', true, 'user_id', w.user_id);
END; $$;

-- ---------------------------------------------------------------------------
-- 7. Link the referral at signup
-- ---------------------------------------------------------------------------
-- The code travels in `raw_user_meta_data` rather than an authenticated RPC
-- call, so it survives email-confirmation signups where no session exists yet.
--
-- This redefines handle_new_user, so it MUST keep every branch the current
-- definition has — the admin bootstrap and the merchant role were both added by
-- later migrations (20260819181500) and silently dropping them would stop the
-- first account becoming admin and stop merchants getting their role. Only the
-- wallet + referral link are new.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bootstrap_done boolean;
  v_code text := upper(btrim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  v_referrer uuid;
  v_welcome int;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS(SELECT 1 FROM public.admin_bootstrap) INTO bootstrap_done;
  IF NOT bootstrap_done THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_bootstrap (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
  END IF;

  CASE COALESCE(NEW.raw_user_meta_data->>'role','customer')
    WHEN 'rider' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'rider') ON CONFLICT DO NOTHING;
      INSERT INTO public.riders (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    WHEN 'merchant' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'merchant') ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'customer') ON CONFLICT DO NOTHING;
  END CASE;

  -- Wallet for every new account.
  PERFORM public.ensure_loyalty_wallet(NEW.id);

  -- Link the referrer. Never self-refer, never overwrite an existing link.
  IF v_code <> '' THEN
    SELECT w.user_id INTO v_referrer
    FROM public.loyalty_wallets w
    WHERE w.referral_code = v_code AND w.user_id <> NEW.id;

    IF v_referrer IS NOT NULL THEN
      UPDATE public.loyalty_wallets
      SET referred_by = v_referrer, updated_at = now()
      WHERE user_id = NEW.id AND referred_by IS NULL;
    END IF;
  END IF;

  -- Optional signup bonus (0 by default so referral farming is pointless).
  v_welcome := (public.loyalty_config()->>'welcome_points')::int;
  IF v_welcome > 0 THEN
    PERFORM public.loyalty_credit(NEW.id, 'signup_bonus', v_welcome, NULL, 'Welcome bonus');
  END IF;

  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. The one place a balance may change
-- ---------------------------------------------------------------------------
-- Negative p_points debits. Raises on an insufficient balance so a redemption
-- can never push a wallet below zero, and the CHECK constraint is the backstop.
--
-- The ledger row is written FIRST and doubles as the idempotency key: if an
-- order is somehow marked delivered twice, the second call's insert conflicts,
-- and the wallet is left untouched instead of paying out again.
CREATE OR REPLACE FUNCTION public.loyalty_credit(
  p_user_id uuid,
  p_kind text,
  p_points int,
  p_order_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance int; v_ledger_id uuid;
BEGIN
  PERFORM public.ensure_loyalty_wallet(p_user_id);

  IF p_points = 0 THEN
    SELECT points INTO v_balance FROM public.loyalty_wallets WHERE user_id = p_user_id;
    RETURN COALESCE(v_balance, 0);
  END IF;

  INSERT INTO public.loyalty_ledger (user_id, order_id, kind, points, note)
  VALUES (p_user_id, p_order_id, p_kind, p_points, p_note)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_ledger_id;

  -- Already granted for this order → report the unchanged balance.
  IF v_ledger_id IS NULL AND p_order_id IS NOT NULL THEN
    SELECT points INTO v_balance FROM public.loyalty_wallets WHERE user_id = p_user_id;
    RETURN COALESCE(v_balance, 0);
  END IF;

  IF p_points < 0 THEN
    UPDATE public.loyalty_wallets
    SET points = points + p_points, updated_at = now()
    WHERE user_id = p_user_id AND points + p_points >= 0
    RETURNING points INTO v_balance;

    IF v_balance IS NULL THEN RAISE EXCEPTION 'Not enough reward points'; END IF;
  ELSE
    UPDATE public.loyalty_wallets
    SET points = points + p_points,
        lifetime_points = lifetime_points + p_points,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING points INTO v_balance;
  END IF;

  RETURN v_balance;
END; $$;

-- ---------------------------------------------------------------------------
-- 9. Earning, attached to delivery
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.loyalty_grant_for_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg jsonb := public.loyalty_config();
  v_points int;
  v_referrer uuid;
  v_credited boolean;
  v_is_first boolean;
BEGIN
  IF COALESCE((cfg->>'enabled')::boolean, true) IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;

  -- Earn on the goods value; delivery fee and tip are not purchase value.
  v_points := floor(GREATEST(COALESCE(NEW.subtotal, 0), 0)
                    * (cfg->>'earn_points_per_100_etb')::numeric / 100)::int;

  IF v_points > 0 THEN
    PERFORM public.loyalty_credit(NEW.customer_id, 'earn', v_points, NEW.id, 'Order reward');
  END IF;

  -- Referral payout, once per referred customer, on their first delivered order.
  SELECT w.referred_by, w.referral_credited INTO v_referrer, v_credited
  FROM public.loyalty_wallets w WHERE w.user_id = NEW.customer_id;

  IF v_referrer IS NOT NULL AND COALESCE(v_credited, false) IS NOT TRUE THEN
    -- Guard against a second payout if two orders deliver concurrently.
    UPDATE public.loyalty_wallets
    SET referral_credited = true, updated_at = now()
    WHERE user_id = NEW.customer_id AND referral_credited IS NOT TRUE;

    IF FOUND THEN
      PERFORM public.loyalty_credit(NEW.customer_id, 'referral_welcome',
        (cfg->>'referee_points')::int, NEW.id, 'Referral welcome reward');
      PERFORM public.loyalty_credit(v_referrer, 'referral_bonus',
        (cfg->>'referrer_points')::int, NEW.id, 'Referral reward');
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_loyalty_on_delivered ON public.orders;
CREATE TRIGGER orders_loyalty_on_delivered
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
  EXECUTE FUNCTION public.loyalty_grant_for_order();

-- ---------------------------------------------------------------------------
-- 10. Redemption inside place_order
-- ---------------------------------------------------------------------------
-- Two optional arguments are appended, so the existing 11-argument call sites
-- keep resolving. The redeemed value, the minimum and the per-order cap are all
-- decided here; the client only states how many points it wants to spend.
--
-- Referral linking is deliberately NOT here: it happens once in the signup
-- trigger from the ?ref= code, because a code entered at checkout could be
-- applied to someone else's account and re-applied order after order.
-- Drop EVERY existing overload, not just the signature this repo knows about.
-- The live database had drifted: `place_order` there also carried
-- `p_delivery_duration_s` and `p_road_distance_km` (13 args, from a road-routing
-- migration that is absent from this repo). A single-signature DROP leaves that
-- overload in place, and then two overloads differing only in trailing optional
-- arguments make every short-form call ambiguous — `place_order(a, b, c)` fails
-- with "function ... is not unique". PostgREST resolves the app's named-argument
-- call by exact parameter set, so the ambiguity is latent rather than loud, which
-- is worse. Verified on a local Postgres 17: single-signature DROP -> 1 stale
-- overload remains and a 3-arg call errors; this loop -> 0 remain, exactly one
-- function is created, and the file is re-runnable.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'place_order'
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.place_order(
  p_shop_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_instructions text DEFAULT NULL,
  p_tip numeric DEFAULT 0,
  p_coupon_code text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_redeem_points int DEFAULT 0
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_order_id uuid; v_item jsonb; v_product record;
  v_subtotal numeric := 0; v_fee numeric; v_base_fee numeric := 50; v_surge numeric := 1;
  v_tip numeric := GREATEST(COALESCE(p_tip, 0), 0); v_method text := COALESCE(p_payment_method, 'cash');
  v_price numeric; v_coupon record; v_disc numeric := 0; v_coupon_id uuid; v_coupon_code text;
  v_option_ids uuid[]; v_option record; v_addon numeric; v_options jsonb;
  v_shop_lat double precision; v_shop_lng double precision;
  v_calc jsonb; v_distance numeric; v_rule text;
  v_cfg jsonb; v_want int := GREATEST(COALESCE(p_redeem_points, 0), 0);
  v_wallet public.loyalty_wallets; v_redeem_value numeric := 0; v_cap numeric; v_use int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
  IF v_tip > 10000 THEN RAISE EXCEPTION 'Tip is too large'; END IF;
  IF v_method NOT IN ('cash','mobile_money','telebirr','cbe','chapa','boa') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  SELECT COALESCE((s.value->>'base_delivery_fee')::numeric, 50), GREATEST(COALESCE((s.value->>'surge_multiplier')::numeric, 1), 1)
    INTO v_base_fee, v_surge FROM public.settings s WHERE s.key = 'platform';
  v_base_fee := COALESCE(v_base_fee, 50); v_surge := COALESCE(v_surge, 1);

  SELECT sh.lat, sh.lng INTO v_shop_lat, v_shop_lng
    FROM public.shops sh WHERE sh.id = p_shop_id AND COALESCE(sh.is_active, true);
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop not found or inactive'; END IF;

  -- Delivery fee: distance-based when the shop is geolocated and rules exist,
  -- otherwise the legacy flat shop fee. Never trusts a client-supplied fee.
  v_calc := public.calculate_delivery_fee(p_shop_id, p_lat, p_lng);
  IF (v_calc->>'ok')::boolean THEN
    v_fee := (v_calc->>'delivery_fee')::numeric;
    v_distance := (v_calc->>'distance')::numeric;
    v_rule := v_calc->>'pricing_rule';
  ELSIF v_calc->>'reason' IN ('shop_location_unavailable', 'customer_location_unavailable') THEN
    SELECT ROUND(COALESCE(sh.delivery_fee, v_base_fee) * v_surge) INTO v_fee
      FROM public.shops sh WHERE sh.id = p_shop_id;
    v_rule := 'flat';
  ELSIF v_calc->>'reason' = 'outside_service_area' THEN
    RAISE EXCEPTION 'Delivery is unavailable at this location';
  ELSE
    RAISE EXCEPTION 'Delivery fee is unavailable for this distance';
  END IF;
  v_fee := COALESCE(v_fee, ROUND(v_base_fee * v_surge));

  DROP TABLE IF EXISTS _po_items;
  CREATE TEMPORARY TABLE _po_items (
    product_id uuid, product_name text, image_url text,
    unit_price numeric, quantity integer, options jsonb
  ) ON COMMIT DROP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT p.id, p.name, p.image_url, p.price, p.discount_percent INTO v_product
      FROM public.products p WHERE p.id = (v_item->>'product_id')::uuid AND p.shop_id = p_shop_id AND COALESCE(p.is_active, true);
    IF NOT FOUND THEN RAISE EXCEPTION 'Product % is unavailable', v_item->>'product_id'; END IF;
    IF COALESCE((v_item->>'quantity')::integer, 0) < 1 OR (v_item->>'quantity')::integer > 99 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

    -- Validate selected options against the database; the price delta comes
    -- from the option row, never from the request body.
    v_addon := 0;
    v_options := '[]'::jsonb;
    IF v_item ? 'option_ids' AND jsonb_typeof(v_item->'option_ids') = 'array' THEN
      SELECT COALESCE(array_agg((value)::uuid), '{}')
        INTO v_option_ids
        FROM jsonb_array_elements_text(v_item->'option_ids');
      FOR v_option IN
        SELECT o.id, o.name AS option_name, o.price_delta, g.name AS group_name
          FROM public.product_options o
          JOIN public.product_option_groups g ON g.id = o.group_id
         WHERE o.id = ANY(v_option_ids)
           AND o.is_active AND g.is_active AND g.product_id = v_product.id
      LOOP
        v_addon := v_addon + COALESCE(v_option.price_delta, 0);
        v_options := v_options || jsonb_build_object(
          'group', v_option.group_name,
          'name', v_option.option_name,
          'price_delta', v_option.price_delta
        );
      END LOOP;
      IF jsonb_array_length(v_options) <> COALESCE(array_length(v_option_ids, 1), 0) THEN
        RAISE EXCEPTION 'One or more selected options are unavailable';
      END IF;
    END IF;

    v_price := ROUND(v_product.price * (100 - LEAST(GREATEST(COALESCE(v_product.discount_percent,0),0),100)) / 100)
               + COALESCE(v_addon, 0);
    INSERT INTO _po_items VALUES (v_product.id, v_product.name, v_product.image_url, v_price, (v_item->>'quantity')::integer, v_options);
    v_subtotal := v_subtotal + v_price * (v_item->>'quantity')::integer;
  END LOOP;

  IF NULLIF(btrim(p_coupon_code), '') IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE upper(code) = upper(btrim(p_coupon_code)) FOR UPDATE;
    IF NOT FOUND OR NOT v_coupon.is_active
       OR (v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > now())
       OR (v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now())
       OR (v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit) THEN
      RAISE EXCEPTION 'Promo code is invalid or expired';
    END IF;
    IF v_subtotal < v_coupon.min_order_amount THEN RAISE EXCEPTION 'Order is below the promo minimum of % ETB', v_coupon.min_order_amount; END IF;
    IF v_coupon.discount_type = 'percent' THEN v_disc := ROUND(v_subtotal * LEAST(v_coupon.discount_value,100) / 100);
    ELSIF v_coupon.discount_type = 'fixed' THEN v_disc := LEAST(v_coupon.discount_value, v_subtotal);
    ELSE v_disc := v_fee; END IF;
    IF v_coupon.max_discount IS NOT NULL THEN v_disc := LEAST(v_disc, v_coupon.max_discount); END IF;
    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
    v_coupon_id := v_coupon.id; v_coupon_code := v_coupon.code;
  END IF;

  -- Reward points. The wallet row is locked so two concurrent checkouts cannot
  -- both spend the same balance.
  v_cfg := public.loyalty_config();
  IF v_want > 0 AND COALESCE((v_cfg->>'enabled')::boolean, true) THEN
    SELECT * INTO v_wallet FROM public.loyalty_wallets WHERE user_id = v_uid FOR UPDATE;
    IF NOT FOUND OR v_wallet.points < v_want THEN
      RAISE EXCEPTION 'You do not have that many reward points';
    END IF;
    IF v_want < (v_cfg->>'min_redeem_points')::int THEN
      RAISE EXCEPTION 'The smallest redemption is % points', (v_cfg->>'min_redeem_points')::int;
    END IF;

    v_cap := ROUND((v_subtotal + v_fee - v_disc) * (v_cfg->>'max_redeem_percent')::numeric / 100);
    -- Largest whole number of points that fits under the per-order cap.
    v_use := LEAST(v_want, floor(v_cap / NULLIF((v_cfg->>'point_value_etb')::numeric, 0))::int);
    IF v_use < (v_cfg->>'min_redeem_points')::int THEN
      RAISE EXCEPTION 'This order is too small to redeem points on';
    END IF;

    v_redeem_value := ROUND(v_use * (v_cfg->>'point_value_etb')::numeric);
    v_redeem_value := LEAST(v_redeem_value, GREATEST(v_subtotal + v_fee - v_disc, 0));

    -- Debit the wallet now; the ledger row is written after the order exists so
    -- it can carry the order id and stay inside the same transaction.
    UPDATE public.loyalty_wallets
    SET points = points - v_use, updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  v_disc := v_disc + v_redeem_value;

  INSERT INTO public.orders (customer_id, shop_id, status, payment_method, payment_status, subtotal, delivery_fee, tip, discount, total,
    customer_name, customer_phone, delivery_address, delivery_instructions, delivery_pin, coupon_id, coupon_code,
    delivery_distance, delivery_rule, shop_lat, shop_lng, customer_lat, customer_lng, lat, lng)
  VALUES (v_uid, p_shop_id, 'pending_payment', v_method, 'unpaid', v_subtotal, v_fee, v_tip, v_disc, GREATEST(v_subtotal + v_fee + v_tip - v_disc, 0),
    NULLIF(BTRIM(p_customer_name), ''), NULLIF(BTRIM(p_customer_phone), ''), NULLIF(BTRIM(p_delivery_address), ''), NULLIF(BTRIM(p_delivery_instructions), ''),
    LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0'), v_coupon_id, v_coupon_code,
    v_distance, v_rule, v_shop_lat, v_shop_lng, p_lat, p_lng, p_lat, p_lng)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity, options)
  SELECT v_order_id, product_id, product_name, image_url, unit_price, quantity, options FROM _po_items;

  -- Attach the redemption to the order now that its id exists.
  IF v_use > 0 THEN
    INSERT INTO public.loyalty_ledger (user_id, order_id, kind, points, note)
    VALUES (v_uid, v_order_id, 'redeem', -v_use, 'Redeemed at checkout');
  END IF;

  RETURN v_order_id;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text, double precision, double precision, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text, double precision, double precision, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. Admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_loyalty_overview(p_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_out jsonb;
  v_outstanding int;
  v_issued int;
  v_redeemed int;
  v_referrals int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;

  SELECT COALESCE(SUM(points), 0) INTO v_outstanding FROM public.loyalty_wallets;
  SELECT COALESCE(SUM(points), 0) INTO v_issued FROM public.loyalty_ledger WHERE points > 0;
  SELECT COALESCE(-SUM(points), 0) INTO v_redeemed FROM public.loyalty_ledger WHERE kind = 'redeem';
  SELECT count(*) INTO v_referrals FROM public.loyalty_wallets WHERE referred_by IS NOT NULL;

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_out
  FROM (
    SELECT w.user_id, w.points, w.lifetime_points, w.referral_code,
           w.referred_by, w.referral_credited, w.created_at,
           p.full_name, p.phone,
           (SELECT count(*) FROM public.loyalty_wallets r WHERE r.referred_by = w.user_id) AS invited_count
    FROM public.loyalty_wallets w
    LEFT JOIN public.profiles p ON p.id = w.user_id
    ORDER BY w.points DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500)
  ) x;

  RETURN jsonb_build_object(
    'outstanding_points', v_outstanding,
    'issued_points', v_issued,
    'redeemed_points', v_redeemed,
    'referral_count', v_referrals,
    'wallets', v_out
  );
END; $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_loyalty(p_user_id uuid, p_points int, p_note text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN public.loyalty_credit(p_user_id, 'admin_adjust', p_points, NULL, NULLIF(btrim(p_note), ''));
END; $$;

-- ---------------------------------------------------------------------------
-- 12. RLS and grants
-- ---------------------------------------------------------------------------
-- Balances are read through the SECURITY DEFINER RPCs above; direct table
-- access is closed so a customer cannot inflate their own points.
ALTER TABLE public.loyalty_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.loyalty_wallets FROM anon, authenticated;
REVOKE ALL ON public.loyalty_ledger FROM anon, authenticated;
GRANT ALL ON public.loyalty_wallets TO service_role;
GRANT ALL ON public.loyalty_ledger TO service_role;

GRANT SELECT ON public.loyalty_ledger TO authenticated;
DROP POLICY IF EXISTS loyalty_ledger_select_own ON public.loyalty_ledger;
CREATE POLICY loyalty_ledger_select_own ON public.loyalty_ledger
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS loyalty_wallets_select_own ON public.loyalty_wallets;
CREATE POLICY loyalty_wallets_select_own ON public.loyalty_wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

REVOKE EXECUTE ON FUNCTION public.my_loyalty() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_loyalty_ledger(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_loyalty_wallet(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.loyalty_credit(uuid, text, int, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_loyalty_overview(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_loyalty(uuid, int, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.my_loyalty() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_loyalty_ledger(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.loyalty_lookup_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_loyalty_overview(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_loyalty(uuid, int, text) TO authenticated;
