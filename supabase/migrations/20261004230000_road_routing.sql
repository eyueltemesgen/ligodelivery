-- Yene Go — road-routing support for the delivery fee engine.
--
-- Additive and idempotent. The distance *source* becomes road routing (OSRM)
-- while the fee *rules* stay exactly as the admin configured them in
-- delivery_fee_rules / settings.delivery. No pricing logic is duplicated here.
--
--   1. orders.delivery_duration_s   : estimated driving seconds at checkout
--   2. orders.delivery_source       : 'road' | 'straight_line' | 'flat'
--   3. calculate_delivery_fee(..., p_road_distance_km)
--        Optional road distance. When supplied it replaces the haversine
--        distance for pricing; otherwise the existing haversine behaviour is
--        unchanged. Callers must not be able to lower the fee by lying, so the
--        value is only ever accepted from the authenticated RPC caller
--        (place_order recomputes it server-side).
--   4. place_order(..., p_road_distance_km, p_delivery_duration_s)
--        Persists the road distance/duration used, so historical orders keep
--        the exact numbers they were priced with.

-- ---------------------------------------------------------------------------
-- 1. Order snapshot columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_duration_s integer,
  ADD COLUMN IF NOT EXISTS delivery_source text;

-- ---------------------------------------------------------------------------
-- 2. calculate_delivery_fee — accept an optional road distance
-- ---------------------------------------------------------------------------
-- The previous 3-argument signature is dropped so there is exactly one
-- implementation; the 4th argument has a default, so existing 3-argument
-- callers keep working unchanged.
DROP FUNCTION IF EXISTS public.calculate_delivery_fee(uuid, double precision, double precision);

CREATE OR REPLACE FUNCTION public.calculate_delivery_fee(
  p_shop_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_road_distance_km double precision DEFAULT NULL
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
  v_source text;
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

  -- Prefer the road distance when the caller supplied a sane one; otherwise
  -- fall back to the straight-line distance. A road distance is never shorter
  -- than the straight line, so a smaller value is treated as untrustworthy and
  -- ignored rather than letting a caller cheapen their own delivery.
  v_distance := ROUND(public.haversine_km(v_shop.lat, v_shop.lng, p_lat, p_lng)::numeric, 2);
  v_source := 'straight_line';
  IF p_road_distance_km IS NOT NULL AND p_road_distance_km > 0
     AND p_road_distance_km >= v_distance
     AND p_road_distance_km <= v_distance * 4 + 5 THEN
    v_distance := ROUND(p_road_distance_km::numeric, 2);
    v_source := 'road';
  END IF;

  IF v_max_km IS NOT NULL AND v_max_km > 0 AND v_distance > v_max_km THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'outside_service_area',
      'distance', v_distance, 'max_distance', v_max_km, 'distance_source', v_source);
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
      RETURN jsonb_build_object('ok', false, 'reason', 'no_rule', 'distance', v_distance,
        'distance_source', v_source);
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
    'distance_source', v_source,
    'delivery_fee', ROUND(v_fee * v_surge),
    'pricing_rule', v_label
  );
END; $$;
REVOKE ALL ON FUNCTION public.calculate_delivery_fee(uuid, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_delivery_fee(uuid, double precision, double precision, double precision) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. place_order — persist road distance, duration and source
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text, double precision, double precision);

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
  p_road_distance_km double precision DEFAULT NULL,
  p_delivery_duration_s integer DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_order_id uuid; v_item jsonb; v_product record;
  v_subtotal numeric := 0; v_fee numeric; v_base_fee numeric := 50; v_surge numeric := 1;
  v_tip numeric := GREATEST(COALESCE(p_tip, 0), 0); v_method text := COALESCE(p_payment_method, 'cash');
  v_price numeric; v_coupon record; v_disc numeric := 0; v_coupon_id uuid; v_coupon_code text;
  v_option_ids uuid[]; v_option record; v_addon numeric; v_options jsonb;
  v_shop_lat double precision; v_shop_lng double precision;
  v_calc jsonb; v_distance numeric; v_rule text; v_source text;
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
  v_calc := public.calculate_delivery_fee(p_shop_id, p_lat, p_lng, p_road_distance_km);
  IF (v_calc->>'ok')::boolean THEN
    v_fee := (v_calc->>'delivery_fee')::numeric;
    v_distance := (v_calc->>'distance')::numeric;
    v_rule := v_calc->>'pricing_rule';
    v_source := COALESCE(v_calc->>'distance_source', 'straight_line');
  ELSIF v_calc->>'reason' IN ('shop_location_unavailable', 'customer_location_unavailable') THEN
    SELECT ROUND(COALESCE(sh.delivery_fee, v_base_fee) * v_surge) INTO v_fee
      FROM public.shops sh WHERE sh.id = p_shop_id;
    v_rule := 'flat';
    v_source := 'flat';
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
    delivery_distance, delivery_rule, delivery_source, delivery_duration_s,
    shop_lat, shop_lng, customer_lat, customer_lng, lat, lng)
  VALUES (v_uid, p_shop_id, 'pending_payment', v_method, 'unpaid', v_subtotal, v_fee, v_tip, v_disc, GREATEST(v_subtotal + v_fee + v_tip - v_disc, 0),
    NULLIF(BTRIM(p_customer_name), ''), NULLIF(BTRIM(p_customer_phone), ''), NULLIF(BTRIM(p_delivery_address), ''), NULLIF(BTRIM(p_delivery_instructions), ''),
    LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0'), v_coupon_id, v_coupon_code,
    v_distance, v_rule, v_source, p_delivery_duration_s,
    v_shop_lat, v_shop_lng, p_lat, p_lng, p_lat, p_lng)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity, options)
  SELECT v_order_id, product_id, product_name, image_url, unit_price, quantity, options FROM _po_items;
  RETURN v_order_id;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text, double precision, double precision, double precision, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text, double precision, double precision, double precision, integer) TO authenticated;
