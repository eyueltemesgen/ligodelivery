-- Fix: order placement failed with "DELETE requires a WHERE clause".
--
-- place_order() cleared its per-call temporary table with an unqualified
-- `DELETE FROM _po_items;`. Postgres instances running with safeupdate (as on
-- Supabase) reject any DELETE without a WHERE clause, so every checkout raised
-- that error and no order could be placed.
--
-- This recreates the function unchanged except for a qualified `DELETE ...
-- WHERE true`, which is a no-op for a table that is freshly created per
-- transaction but satisfies safeupdate. No table, column or policy changes.

CREATE OR REPLACE FUNCTION public.place_order(
  p_shop_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_instructions text DEFAULT NULL,
  p_tip numeric DEFAULT 0,
  p_coupon_code text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_order_id uuid; v_item jsonb; v_product record;
  v_subtotal numeric := 0; v_fee numeric; v_base_fee numeric := 50; v_surge numeric := 1;
  v_tip numeric := GREATEST(COALESCE(p_tip, 0), 0); v_method text := COALESCE(p_payment_method, 'cash');
  v_price numeric; v_coupon record; v_disc numeric := 0; v_coupon_id uuid; v_coupon_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Order must contain at least one item'; END IF;
  IF v_tip > 10000 THEN RAISE EXCEPTION 'Tip is too large'; END IF;
  IF v_method NOT IN ('cash','mobile_money','telebirr','cbe','chapa','boa') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  SELECT COALESCE((s.value->>'base_delivery_fee')::numeric, 50), GREATEST(COALESCE((s.value->>'surge_multiplier')::numeric, 1), 1)
    INTO v_base_fee, v_surge FROM public.settings s WHERE s.key = 'platform';
  v_base_fee := COALESCE(v_base_fee, 50); v_surge := COALESCE(v_surge, 1);

  SELECT ROUND(COALESCE(sh.delivery_fee, v_base_fee) * v_surge) INTO v_fee
    FROM public.shops sh WHERE sh.id = p_shop_id AND COALESCE(sh.is_active, true);
  IF NOT FOUND THEN RAISE EXCEPTION 'Shop not found or inactive'; END IF;

  CREATE TEMPORARY TABLE IF NOT EXISTS _po_items (product_id uuid, product_name text, image_url text, unit_price numeric, quantity integer) ON COMMIT DROP;
  DELETE FROM _po_items WHERE true;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT p.id, p.name, p.image_url, p.price, p.discount_percent INTO v_product
      FROM public.products p WHERE p.id = (v_item->>'product_id')::uuid AND p.shop_id = p_shop_id AND COALESCE(p.is_active, true);
    IF NOT FOUND THEN RAISE EXCEPTION 'Product % is unavailable', v_item->>'product_id'; END IF;
    IF COALESCE((v_item->>'quantity')::integer, 0) < 1 OR (v_item->>'quantity')::integer > 99 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    v_price := ROUND(v_product.price * (100 - LEAST(GREATEST(COALESCE(v_product.discount_percent,0),0),100)) / 100);
    INSERT INTO _po_items VALUES (v_product.id, v_product.name, v_product.image_url, v_price, (v_item->>'quantity')::integer);
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
    customer_name, customer_phone, delivery_address, delivery_instructions, delivery_pin, coupon_id, coupon_code)
  VALUES (v_uid, p_shop_id, 'pending_payment', v_method, 'unpaid', v_subtotal, v_fee, v_tip, v_disc, GREATEST(v_subtotal + v_fee + v_tip - v_disc, 0),
    NULLIF(BTRIM(p_customer_name), ''), NULLIF(BTRIM(p_customer_phone), ''), NULLIF(BTRIM(p_delivery_address), ''), NULLIF(BTRIM(p_delivery_instructions), ''),
    LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0'), v_coupon_id, v_coupon_code)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity)
  SELECT v_order_id, product_id, product_name, image_url, unit_price, quantity FROM _po_items;
  RETURN v_order_id;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric, text) TO authenticated;
