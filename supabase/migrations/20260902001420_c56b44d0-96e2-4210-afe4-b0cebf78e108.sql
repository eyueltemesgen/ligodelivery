-- 1) Harden admin bootstrap: require BOTH the one-time sentinel to be unused AND zero existing admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE bootstrap_done boolean;
DECLARE any_admin boolean;
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
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO any_admin;
  -- One-time bootstrap only: sentinel unused AND no admin has ever existed
  IF NOT bootstrap_done AND NOT any_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_bootstrap (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Never trust arbitrary metadata roles: only 'rider' is honored, everything else is customer
  IF COALESCE(NEW.raw_user_meta_data->>'role','customer') = 'rider' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'rider') ON CONFLICT DO NOTHING;
    INSERT INTO public.riders (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'customer') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $fn$;

-- 2) Server-side order placement: prices are recomputed from authoritative tables,
--    client-supplied amounts are ignored entirely.
CREATE OR REPLACE FUNCTION public.place_order(
  p_shop_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_instructions text DEFAULT NULL,
  p_tip numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_subtotal numeric := 0;
  v_fee numeric;
  v_base_fee numeric := 50;
  v_surge numeric := 1;
  v_tip numeric := GREATEST(COALESCE(p_tip, 0), 0);
  v_method text := COALESCE(p_payment_method, 'cash');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  IF v_tip > 10000 THEN
    RAISE EXCEPTION 'Tip is too large';
  END IF;
  IF v_method NOT IN ('cash','mobile_money','telebirr','cbe','chapa','boa') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  -- Delivery fee from the shop, falling back to platform settings
  SELECT COALESCE((s.value->>'base_delivery_fee')::numeric, 50),
         GREATEST(COALESCE((s.value->>'surge_multiplier')::numeric, 1), 1)
    INTO v_base_fee, v_surge
    FROM public.settings s WHERE s.key = 'platform';
  v_base_fee := COALESCE(v_base_fee, 50);
  v_surge := COALESCE(v_surge, 1);

  SELECT ROUND(COALESCE(sh.delivery_fee, v_base_fee) * v_surge)
    INTO v_fee
    FROM public.shops sh
   WHERE sh.id = p_shop_id AND COALESCE(sh.is_active, true);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop not found or inactive';
  END IF;

  -- Recompute every line from the products table
  CREATE TEMPORARY TABLE IF NOT EXISTS _po_items (
    product_id uuid, product_name text, image_url text, unit_price numeric, quantity integer
  ) ON COMMIT DROP;
  DELETE FROM _po_items;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT p.id, p.name, p.image_url, p.price
      INTO v_product
      FROM public.products p
     WHERE p.id = (v_item->>'product_id')::uuid
       AND p.shop_id = p_shop_id
       AND COALESCE(p.is_active, true);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is unavailable', v_item->>'product_id';
    END IF;
    IF COALESCE((v_item->>'quantity')::integer, 0) < 1 OR (v_item->>'quantity')::integer > 99 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;
    INSERT INTO _po_items VALUES (
      v_product.id, v_product.name, v_product.image_url, v_product.price,
      (v_item->>'quantity')::integer
    );
    v_subtotal := v_subtotal + v_product.price * (v_item->>'quantity')::integer;
  END LOOP;

  INSERT INTO public.orders (
    customer_id, shop_id, status, payment_method, payment_status,
    subtotal, delivery_fee, tip, total,
    customer_name, customer_phone, delivery_address, delivery_instructions,
    delivery_pin
  ) VALUES (
    v_uid, p_shop_id, 'pending_payment', v_method, 'unpaid',
    v_subtotal, v_fee, v_tip, v_subtotal + v_fee + v_tip,
    NULLIF(BTRIM(p_customer_name), ''), NULLIF(BTRIM(p_customer_phone), ''),
    NULLIF(BTRIM(p_delivery_address), ''), NULLIF(BTRIM(p_delivery_instructions), ''),
    LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0')
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity)
  SELECT v_order_id, product_id, product_name, image_url, unit_price, quantity FROM _po_items;

  RETURN v_order_id;
END; $fn$;

REVOKE ALL ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, text, text, text, text, text, numeric) TO authenticated;

-- Clients must go through place_order; no direct inserts
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
REVOKE INSERT ON public.orders FROM authenticated;
REVOKE INSERT ON public.order_items FROM authenticated;

-- 3) Column guard: non-admins may only change `status` on orders.
CREATE OR REPLACE FUNCTION public.orders_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- Internal SECURITY DEFINER flows (accept_order, complete_delivery, dispatch) set this flag
  IF current_setting('app.order_internal', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
     OR NEW.discount IS DISTINCT FROM OLD.discount
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.tip IS DISTINCT FROM OLD.tip
     OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.shop_id IS DISTINCT FROM OLD.shop_id
     OR NEW.rider_payout IS DISTINCT FROM OLD.rider_payout
     OR NEW.delivery_pin IS DISTINCT FROM OLD.delivery_pin
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.order_code IS DISTINCT FROM OLD.order_code THEN
    RAISE EXCEPTION 'Only the order status can be updated';
  END IF;
  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
CREATE TRIGGER orders_guard_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_update();
REVOKE ALL ON FUNCTION public.orders_guard_update() FROM PUBLIC, anon, authenticated;