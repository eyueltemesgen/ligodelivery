-- Yene Go — location-aware delivery fee engine + product menu options.
--
-- Additive and idempotent. Nothing here drops or rewrites existing data:
--   1. delivery_fee_rules  : admin-managed distance brackets
--   2. settings 'delivery' : pricing method, base+km, max service distance
--   3. orders              : distance + coordinate snapshots for historical accuracy
--   4. order_items         : per-line option snapshot (jsonb)
--   5. product_option_groups / product_options : real per-product variants
--   6. helpers + calculate_delivery_fee() RPC : one central fee calculation
--   7. place_order()        : server-authoritative, distance-aware, option-aware
--
-- Backward compatibility: a shop keeps its flat delivery_fee until it gets
-- coordinates AND the admin defines rules. Only then does the engine require a
-- customer location and price by distance.

-- ---------------------------------------------------------------------------
-- 1. Distance brackets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_distance numeric(6,2) NOT NULL DEFAULT 0,
  max_distance numeric(6,2),
  fee numeric(10,2) NOT NULL DEFAULT 0,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_fee_rules_range_valid CHECK (
    min_distance >= 0 AND (max_distance IS NULL OR max_distance > min_distance)
  ),
  CONSTRAINT delivery_fee_rules_fee_valid CHECK (fee >= 0)
);
CREATE INDEX IF NOT EXISTS delivery_fee_rules_active_idx
  ON public.delivery_fee_rules (is_active, min_distance);

GRANT SELECT ON public.delivery_fee_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_fee_rules TO authenticated;
GRANT ALL ON public.delivery_fee_rules TO service_role;
ALTER TABLE public.delivery_fee_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_fee_rules_public_read ON public.delivery_fee_rules;
CREATE POLICY delivery_fee_rules_public_read ON public.delivery_fee_rules
  FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS delivery_fee_rules_admin_write ON public.delivery_fee_rules;
CREATE POLICY delivery_fee_rules_admin_write ON public.delivery_fee_rules
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS delivery_fee_rules_updated ON public.delivery_fee_rules;
CREATE TRIGGER delivery_fee_rules_updated BEFORE UPDATE ON public.delivery_fee_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a starting bracket set only when the table is empty. These are examples
-- the admin is expected to tune; they are not Yene Go's final pricing.
INSERT INTO public.delivery_fee_rules (min_distance, max_distance, fee, label, priority)
SELECT * FROM (VALUES
  (0::numeric,  2::numeric,  30::numeric, '0-2 km',  1),
  (2::numeric,  4::numeric,  40::numeric, '2-4 km',  2),
  (4::numeric,  6::numeric,  50::numeric, '4-6 km',  3),
  (6::numeric,  8::numeric,  65::numeric, '6-8 km',  4),
  (8::numeric, 10::numeric,  80::numeric, '8-10 km', 5)
) AS seed(min_distance, max_distance, fee, label, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_fee_rules);

-- ---------------------------------------------------------------------------
-- 2. Delivery settings (pricing method, service area)
-- ---------------------------------------------------------------------------
INSERT INTO public.settings (key, value, is_public)
VALUES (
  'delivery',
  '{"pricing_method":"brackets","base_fee":25,"per_km":10,"max_distance_km":10,"enabled":true}'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE
  SET value = public.settings.value
            || '{"pricing_method":"brackets","base_fee":25,"per_km":10,"max_distance_km":10,"enabled":true}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Order snapshot columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_distance numeric(6,2),
  ADD COLUMN IF NOT EXISTS delivery_rule text,
  ADD COLUMN IF NOT EXISTS shop_lat double precision,
  ADD COLUMN IF NOT EXISTS shop_lng double precision,
  ADD COLUMN IF NOT EXISTS customer_lat double precision,
  ADD COLUMN IF NOT EXISTS customer_lng double precision;

-- ---------------------------------------------------------------------------
-- 4. Per-line option snapshot
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 5. Product option groups / options (real, per-product, optional)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  is_multi boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_option_groups_product_idx
  ON public.product_option_groups (product_id, sort_order);

CREATE TABLE IF NOT EXISTS public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_options_delta_valid CHECK (price_delta >= 0)
);
CREATE INDEX IF NOT EXISTS product_options_group_idx
  ON public.product_options (group_id, sort_order);

GRANT SELECT ON public.product_option_groups TO anon, authenticated;
GRANT SELECT ON public.product_options TO anon, authenticated;
GRANT ALL ON public.product_option_groups TO service_role;
GRANT ALL ON public.product_options TO service_role;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_option_groups_read ON public.product_option_groups;
CREATE POLICY product_option_groups_read ON public.product_option_groups
  FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS product_option_groups_write ON public.product_option_groups;
CREATE POLICY product_option_groups_write ON public.product_option_groups
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR public.owns_shop((SELECT p.shop_id FROM public.products p WHERE p.id = product_id))
  )
  WITH CHECK (
    public.is_admin()
    OR public.owns_shop((SELECT p.shop_id FROM public.products p WHERE p.id = product_id))
  );

DROP POLICY IF EXISTS product_options_read ON public.product_options;
CREATE POLICY product_options_read ON public.product_options
  FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS product_options_write ON public.product_options;
CREATE POLICY product_options_write ON public.product_options
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR public.owns_shop((
      SELECT p.shop_id FROM public.product_option_groups g
      JOIN public.products p ON p.id = g.product_id
      WHERE g.id = group_id
    ))
  )
  WITH CHECK (
    public.is_admin()
    OR public.owns_shop((
      SELECT p.shop_id FROM public.product_option_groups g
      JOIN public.products p ON p.id = g.product_id
      WHERE g.id = group_id
    ))
  );

DROP TRIGGER IF EXISTS product_option_groups_updated ON public.product_option_groups;
CREATE TRIGGER product_option_groups_updated BEFORE UPDATE ON public.product_option_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 6. Distance helpers + central fee calculation
-- ---------------------------------------------------------------------------

-- Great-circle distance in kilometres (haversine). Reliable fallback when road
-- routing is not available; accurate enough for intra-city delivery pricing.
CREATE OR REPLACE FUNCTION public.haversine_km(
  p_lat1 double precision, p_lng1 double precision,
  p_lat2 double precision, p_lng2 double precision
)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371.0 * 2 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2))
      * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  ))
$$;
REVOKE ALL ON FUNCTION public.haversine_km(double precision, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.haversine_km(double precision, double precision, double precision, double precision) TO authenticated, service_role;

-- Central server-side delivery fee calculation. Returns a JSON object so the
-- same logic serves cart, checkout and order placement:
--   { ok, distance, delivery_fee, pricing_rule }  on success
--   { ok:false, reason, distance? }               when it cannot be priced
CREATE OR REPLACE FUNCTION public.calculate_delivery_fee(
  p_shop_id uuid,
  p_lat double precision,
  p_lng double precision
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop record;
  v_method text := 'brackets';
  v_base_fee numeric := 25;
  v_per_km numeric := 10;
  v_max_km numeric;
  v_surge numeric := 1;
  v_distance numeric;
  v_fee numeric;
  v_label text;
  v_rule record;
  v_has_rules boolean;
BEGIN
  SELECT sh.id, sh.lat, sh.lng, sh.delivery_fee, sh.is_active
    INTO v_shop FROM public.shops sh WHERE sh.id = p_shop_id;
  IF NOT FOUND OR COALESCE(v_shop.is_active, false) = false THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'shop_not_found');
  END IF;

  SELECT COALESCE((s.value->>'pricing_method'), 'brackets'),
         COALESCE((s.value->>'base_fee')::numeric, 25),
         COALESCE((s.value->>'per_km')::numeric, 10),
         (s.value->>'max_distance_km')::numeric
    INTO v_method, v_base_fee, v_per_km, v_max_km
    FROM public.settings s WHERE s.key = 'delivery';

  SELECT GREATEST(COALESCE((s.value->>'surge_multiplier')::numeric, 1), 1)
    INTO v_surge FROM public.settings s WHERE s.key = 'platform';
  v_surge := COALESCE(v_surge, 1);

  SELECT EXISTS (SELECT 1 FROM public.delivery_fee_rules r WHERE r.is_active) INTO v_has_rules;

  -- Legacy mode: no shop coordinates or no pricing configured → flat shop fee.
  IF v_shop.lat IS NULL OR v_shop.lng IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'shop_location_unavailable',
      'delivery_fee', ROUND(COALESCE(v_shop.delivery_fee, 50) * v_surge));
  END IF;
  IF v_method = 'brackets' AND NOT v_has_rules THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_rule');
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'customer_location_unavailable');
  END IF;

  v_distance := ROUND(public.haversine_km(v_shop.lat, v_shop.lng, p_lat, p_lng)::numeric, 2);

  IF v_max_km IS NOT NULL AND v_max_km > 0 AND v_distance > v_max_km THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'outside_service_area',
      'distance', v_distance, 'max_distance', v_max_km);
  END IF;

  IF v_method = 'base_plus_km' THEN
    v_fee := v_base_fee + (v_per_km * v_distance);
    v_label := 'base+km';
  ELSE
    SELECT r.* INTO v_rule FROM public.delivery_fee_rules r
      WHERE r.is_active
        AND r.min_distance <= v_distance
        AND (r.max_distance IS NULL OR v_distance < r.max_distance)
      ORDER BY r.priority, r.min_distance
      LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_rule', 'distance', v_distance);
    END IF;
    v_fee := v_rule.fee;
    v_label := COALESCE(v_rule.label,
      CASE WHEN v_rule.max_distance IS NULL
           THEN v_rule.min_distance::text || '+ km'
           ELSE v_rule.min_distance::text || '-' || v_rule.max_distance::text || ' km' END);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'distance', v_distance,
    'delivery_fee', ROUND(v_fee * v_surge),
    'pricing_rule', v_label
  );
END; $$;
REVOKE ALL ON FUNCTION public.calculate_delivery_fee(uuid, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_delivery_fee(uuid, double precision, double precision) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. place_order — server-authoritative, options- and distance-aware
-- ---------------------------------------------------------------------------

-- Replace the previous 9-argument definition with the extended one. The extra
-- arguments are optional so existing callers keep working.
DROP FUNCTION IF EXISTS public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text);

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
  p_lng double precision DEFAULT NULL
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
  RETURN v_order_id;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text, double precision, double precision) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text, double precision, double precision) TO authenticated;
