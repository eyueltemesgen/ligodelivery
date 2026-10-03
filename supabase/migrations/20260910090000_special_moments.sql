-- Special Moments: Surprises, Gifts, Catering & Decoration
-- ---------------------------------------------------------------------------
-- Additive, non-destructive extension of the existing marketplace. Nothing in
-- this migration alters or removes existing shops, products, orders, customers,
-- payments or storage. It only adds:
--   * service_categories / services / service_options      (catalogue)
--   * service_requests / service_request_items             (booking + quote flow)
--   * one nullable-but-defaulted column on orders (order_type)
--   * new SECURITY DEFINER RPCs and RLS policies
--
-- A "service" is a bookable offering owned by an existing shop, so one shop can
-- offer products and any number of service types. A request is the customer's
-- booking/quote intent, created through submit_service_request() which
-- recomputes every price server-side (mirroring place_order()).
--
-- Everything is idempotent (IF NOT EXISTS / DROP ... IF EXISTS) so it can be
-- re-applied safely.

-- 1. Service categories -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  emoji text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_categories_anon_read ON public.service_categories;
CREATE POLICY service_categories_anon_read ON public.service_categories
  FOR SELECT TO anon USING (is_active);
DROP POLICY IF EXISTS service_categories_auth_read ON public.service_categories;
CREATE POLICY service_categories_auth_read ON public.service_categories
  FOR SELECT TO authenticated USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS service_categories_admin_write ON public.service_categories;
CREATE POLICY service_categories_admin_write ON public.service_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS service_categories_updated ON public.service_categories;
CREATE TRIGGER service_categories_updated BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Services -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text,
  summary text,
  description text,
  pricing_type text NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'quote')),
  price numeric(10,2) NOT NULL DEFAULT 0,
  starting_price numeric(10,2),
  price_unit text,
  duration_minutes integer,
  preparation_hours integer,
  min_guests integer,
  max_guests integer,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_url text,
  includes jsonb NOT NULL DEFAULT '[]'::jsonb,
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  occasions text[] NOT NULL DEFAULT '{}',
  service_area text,
  requires_location boolean NOT NULL DEFAULT true,
  requires_schedule boolean NOT NULL DEFAULT true,
  requires_recipient boolean NOT NULL DEFAULT false,
  anonymous_option boolean NOT NULL DEFAULT false,
  lead_time_hours integer NOT NULL DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  review_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS services_shop_idx ON public.services(shop_id);
CREATE INDEX IF NOT EXISTS services_category_idx ON public.services(service_category_id);
CREATE INDEX IF NOT EXISTS services_active_idx ON public.services(is_active);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS services_anon_read ON public.services;
CREATE POLICY services_anon_read ON public.services
  FOR SELECT TO anon USING (is_active);
DROP POLICY IF EXISTS services_auth_read ON public.services;
CREATE POLICY services_auth_read ON public.services
  FOR SELECT TO authenticated
  USING (
    is_active
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.shops sh WHERE sh.id = shop_id AND sh.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS services_admin_write ON public.services;
CREATE POLICY services_admin_write ON public.services
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.owns_shop(shop_id))
  WITH CHECK (public.is_admin() OR public.owns_shop(shop_id));
DROP TRIGGER IF EXISTS services_updated ON public.services;
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Service options / add-ons ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  option_type text NOT NULL DEFAULT 'addon' CHECK (option_type IN ('addon', 'choice')),
  group_name text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_options_service_idx ON public.service_options(service_id);
GRANT SELECT ON public.service_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_options TO authenticated;
GRANT ALL ON public.service_options TO service_role;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_options_anon_read ON public.service_options;
CREATE POLICY service_options_anon_read ON public.service_options
  FOR SELECT TO anon
  USING (
    is_active
    AND EXISTS (SELECT 1 FROM public.services sv WHERE sv.id = service_id AND sv.is_active)
  );
DROP POLICY IF EXISTS service_options_auth_read ON public.service_options;
CREATE POLICY service_options_auth_read ON public.service_options
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.services sv
      JOIN public.shops sh ON sh.id = sv.shop_id
      WHERE sv.id = service_id AND (sv.is_active OR sh.owner_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS service_options_admin_write ON public.service_options;
CREATE POLICY service_options_admin_write ON public.service_options
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.services sv
      WHERE sv.id = service_id AND public.owns_shop(sv.shop_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.services sv
      WHERE sv.id = service_id AND public.owns_shop(sv.shop_id)
    )
  );

-- 4. Service requests ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text NOT NULL UNIQUE
    DEFAULT ('SM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  customer_id uuid NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','reviewing','quoted','confirmed','preparing','scheduled','out_for_delivery','in_progress','completed','cancelled')),
  pricing_type text NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'quote')),
  service_name text NOT NULL,
  service_category_slug text,
  customer_name text,
  customer_phone text,
  recipient_name text,
  recipient_phone text,
  keep_sender_anonymous boolean NOT NULL DEFAULT false,
  event_type text,
  event_date date,
  event_time time,
  guest_count integer,
  location text,
  lat double precision,
  lng double precision,
  theme text,
  budget numeric(10,2),
  message text,
  special_instructions text,
  customization jsonb NOT NULL DEFAULT '{}'::jsonb,
  quoted_amount numeric(10,2),
  quoted_notes text,
  quoted_at timestamptz,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  admin_notes text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_customer_idx ON public.service_requests(customer_id);
CREATE INDEX IF NOT EXISTS service_requests_shop_idx ON public.service_requests(shop_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests(status);
GRANT SELECT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_requests_select ON public.service_requests;
CREATE POLICY service_requests_select ON public.service_requests
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.shops sh WHERE sh.id = shop_id AND sh.owner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS service_requests_update ON public.service_requests;
CREATE POLICY service_requests_update ON public.service_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.shops sh WHERE sh.id = shop_id AND sh.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.shops sh WHERE sh.id = shop_id AND sh.owner_id = auth.uid()
    )
  );
DROP TRIGGER IF EXISTS service_requests_updated ON public.service_requests;
CREATE TRIGGER service_requests_updated BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Service request line items ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  option_id uuid REFERENCES public.service_options(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_request_items_request_idx ON public.service_request_items(request_id);
GRANT SELECT ON public.service_request_items TO authenticated;
GRANT ALL ON public.service_request_items TO service_role;
ALTER TABLE public.service_request_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_request_items_select ON public.service_request_items;
CREATE POLICY service_request_items_select ON public.service_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests r
      WHERE r.id = request_id
        AND (
          r.customer_id = auth.uid()
          OR public.is_admin()
          OR EXISTS (SELECT 1 FROM public.shops sh WHERE sh.id = r.shop_id AND sh.owner_id = auth.uid())
        )
    )
  );

-- 6. Orders gain an order_type discriminator (existing rows default to 'product')
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'product'
  CHECK (order_type IN ('product', 'delivery', 'service'));
CREATE INDEX IF NOT EXISTS orders_type_idx ON public.orders(order_type);

-- Keep order_type immutable for non-admins by extending the existing guard.
CREATE OR REPLACE FUNCTION public.orders_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF current_setting('app.order_internal', true) = '1' THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
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
     OR NEW.order_code IS DISTINCT FROM OLD.order_code
     OR NEW.order_type IS DISTINCT FROM OLD.order_type THEN
    RAISE EXCEPTION 'Only the order status can be updated';
  END IF;
  NEW.commission_percent := OLD.commission_percent;
  NEW.commission_amount := OLD.commission_amount;
  NEW.merchant_net := OLD.merchant_net;
  RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.orders_guard_update() FROM PUBLIC, anon, authenticated;

-- 7. Request guard: providers may move status/schedule, admins may price ------
CREATE OR REPLACE FUNCTION public.service_requests_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  -- Keep the customer-facing totals in step with the quote, whoever sets it.
  IF NEW.pricing_type = 'quote' AND NEW.quoted_amount IS DISTINCT FROM OLD.quoted_amount THEN
    NEW.total := COALESCE(NEW.quoted_amount, 0);
    NEW.subtotal := COALESCE(NEW.quoted_amount, 0);
  END IF;

  IF current_setting('app.service_internal', true) = '1' OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.shop_id IS DISTINCT FROM OLD.shop_id
     OR NEW.service_id IS DISTINCT FROM OLD.service_id
     OR NEW.service_name IS DISTINCT FROM OLD.service_name
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.quoted_amount IS DISTINCT FROM OLD.quoted_amount
     OR NEW.quoted_notes IS DISTINCT FROM OLD.quoted_notes
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.recipient_name IS DISTINCT FROM OLD.recipient_name
     OR NEW.recipient_phone IS DISTINCT FROM OLD.recipient_phone
     OR NEW.keep_sender_anonymous IS DISTINCT FROM OLD.keep_sender_anonymous
     OR NEW.customer_name IS DISTINCT FROM OLD.customer_name
     OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the request status, schedule and notes can be updated';
  END IF;
  RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.service_requests_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS service_requests_guard ON public.service_requests;
CREATE TRIGGER service_requests_guard BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.service_requests_guard();

-- 8. Customer + admin notifications on request lifecycle ----------------------
CREATE OR REPLACE FUNCTION public.service_requests_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_title text;
  v_body text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (
      NEW.customer_id,
      'Request received',
      'We received your ' || NEW.service_name || ' request. Reference ' || NEW.request_code || '.',
      'service'
    );
    INSERT INTO public.notifications (user_id, title, body, type)
    SELECT ur.user_id,
           'New ' || COALESCE(NEW.service_category_slug, 'service') || ' request',
           COALESCE(NULLIF(NEW.customer_name, ''), 'A customer') || ' requested ' || NEW.service_name ||
             ' (' || NEW.request_code || ').',
           'service'
      FROM public.user_roles ur WHERE ur.role = 'admin';
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_title := CASE NEW.status
      WHEN 'reviewing' THEN 'Request under review'
      WHEN 'quoted' THEN 'Your quote is ready'
      WHEN 'confirmed' THEN 'Request confirmed'
      WHEN 'preparing' THEN 'Preparation started'
      WHEN 'scheduled' THEN 'Service scheduled'
      WHEN 'out_for_delivery' THEN 'On the way'
      WHEN 'in_progress' THEN 'Service in progress'
      WHEN 'completed' THEN 'Service completed'
      WHEN 'cancelled' THEN 'Request cancelled'
      ELSE 'Request updated'
    END;
    v_body := CASE NEW.status
      WHEN 'quoted' THEN
        'Your quote for ' || NEW.service_name || ' is ready. Open the request to review and confirm.'
      ELSE
        NEW.service_name || ' (' || NEW.request_code || ') is now ' || replace(NEW.status, '_', ' ') || '.'
    END;
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (NEW.customer_id, v_title, v_body, 'service');
  END IF;
  RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.service_requests_notify() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS service_requests_notify ON public.service_requests;
CREATE TRIGGER service_requests_notify AFTER INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.service_requests_notify();

-- 9. submit_service_request: server-authoritative request creation ------------
CREATE OR REPLACE FUNCTION public.submit_service_request(
  p_service_id uuid,
  p_option_ids uuid[] DEFAULT '{}',
  p_payment_method text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL,
  p_keep_sender_anonymous boolean DEFAULT false,
  p_event_type text DEFAULT NULL,
  p_event_date date DEFAULT NULL,
  p_event_time time DEFAULT NULL,
  p_guest_count integer DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_theme text DEFAULT NULL,
  p_budget numeric DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_special_instructions text DEFAULT NULL,
  p_customization jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_service record;
  v_option record;
  v_request_id uuid;
  v_base numeric := 0;
  v_subtotal numeric := 0;
  v_method text := NULLIF(btrim(COALESCE(p_payment_method, '')), '');
  v_opt_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT s.*, sh.is_active AS shop_active
    INTO v_service
    FROM public.services s
    JOIN public.shops sh ON sh.id = s.shop_id
   WHERE s.id = p_service_id;
  IF v_service.id IS NULL THEN RAISE EXCEPTION 'Service not found'; END IF;
  IF NOT v_service.is_active OR NOT v_service.shop_active THEN
    RAISE EXCEPTION 'This service is not available right now';
  END IF;

  IF v_service.requires_schedule THEN
    IF p_event_date IS NULL THEN RAISE EXCEPTION 'Please choose an event date'; END IF;
    IF p_event_date < CURRENT_DATE THEN RAISE EXCEPTION 'Event date cannot be in the past'; END IF;
  END IF;
  IF v_service.requires_location AND NULLIF(btrim(COALESCE(p_location, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Please provide the delivery or event location';
  END IF;
  IF p_guest_count IS NOT NULL THEN
    IF v_service.min_guests IS NOT NULL AND p_guest_count < v_service.min_guests THEN
      RAISE EXCEPTION 'This service requires at least % guests', v_service.min_guests;
    END IF;
    IF v_service.max_guests IS NOT NULL AND p_guest_count > v_service.max_guests THEN
      RAISE EXCEPTION 'This service supports at most % guests', v_service.max_guests;
    END IF;
  END IF;
  IF v_method IS NOT NULL AND v_method NOT IN ('cash','mobile_money','telebirr','cbe','chapa','boa') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  v_base := CASE WHEN v_service.pricing_type = 'fixed'
                 THEN COALESCE(NULLIF(v_service.price, 0), v_service.starting_price, 0)
                 ELSE 0 END;
  v_subtotal := v_base;

  CREATE TEMPORARY TABLE IF NOT EXISTS _sr_items (
    service_id uuid, option_id uuid, name text, unit_price numeric, quantity integer
  ) ON COMMIT DROP;
  DELETE FROM _sr_items WHERE true;

  INSERT INTO _sr_items (service_id, option_id, name, unit_price, quantity)
  VALUES (v_service.id, NULL, v_service.name, v_base, 1);

  IF p_option_ids IS NOT NULL THEN
    FOREACH v_opt_id IN ARRAY p_option_ids LOOP
      SELECT * INTO v_option
        FROM public.service_options
       WHERE id = v_opt_id AND service_id = v_service.id AND is_active;
      IF NOT FOUND THEN RAISE EXCEPTION 'A selected option is no longer available'; END IF;
      INSERT INTO _sr_items (service_id, option_id, name, unit_price, quantity)
      VALUES (v_service.id, v_option.id, v_option.name, COALESCE(v_option.price_delta, 0), 1);
      v_subtotal := v_subtotal + COALESCE(v_option.price_delta, 0);
    END LOOP;
  END IF;

  INSERT INTO public.service_requests (
    customer_id, shop_id, service_id, status, pricing_type, service_name, service_category_slug,
    customer_name, customer_phone, recipient_name, recipient_phone, keep_sender_anonymous,
    event_type, event_date, event_time, guest_count, location, theme, budget, message,
    special_instructions, customization, subtotal, total, payment_method
  ) VALUES (
    v_uid, v_service.shop_id, v_service.id, 'requested', v_service.pricing_type, v_service.name,
    (SELECT slug FROM public.service_categories WHERE id = v_service.service_category_id),
    NULLIF(btrim(COALESCE(p_customer_name, '')), ''),
    NULLIF(btrim(COALESCE(p_customer_phone, '')), ''),
    NULLIF(btrim(COALESCE(p_recipient_name, '')), ''),
    NULLIF(btrim(COALESCE(p_recipient_phone, '')), ''),
    COALESCE(p_keep_sender_anonymous, false),
    NULLIF(btrim(COALESCE(p_event_type, '')), ''),
    p_event_date, p_event_time, p_guest_count,
    NULLIF(btrim(COALESCE(p_location, '')), ''),
    NULLIF(btrim(COALESCE(p_theme, '')), ''),
    p_budget,
    NULLIF(btrim(COALESCE(p_message, '')), ''),
    NULLIF(btrim(COALESCE(p_special_instructions, '')), ''),
    COALESCE(p_customization, '{}'::jsonb),
    v_subtotal,
    CASE WHEN v_service.pricing_type = 'fixed' THEN v_subtotal ELSE 0 END,
    v_method
  ) RETURNING id INTO v_request_id;

  INSERT INTO public.service_request_items (request_id, service_id, option_id, name, unit_price, quantity)
  SELECT v_request_id, service_id, option_id, name, unit_price, quantity FROM _sr_items;

  RETURN v_request_id;
END; $fn$;
REVOKE ALL ON FUNCTION public.submit_service_request(
  uuid, uuid[], text, text, text, text, text, boolean, text, date, time, integer, text, text, numeric, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_service_request(
  uuid, uuid[], text, text, text, text, text, boolean, text, date, time, integer, text, text, numeric, text, text, jsonb
) TO authenticated;

-- 10. accept_service_quote: customer confirms a quote and an order is created --
CREATE OR REPLACE FUNCTION public.accept_service_quote(p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.service_requests;
  v_order_id uuid;
  v_amount numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_req FROM public.service_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.customer_id <> v_uid THEN RAISE EXCEPTION 'This request does not belong to you'; END IF;
  IF v_req.status <> 'quoted' THEN RAISE EXCEPTION 'This request has not been quoted yet'; END IF;
  IF v_req.order_id IS NOT NULL THEN RAISE EXCEPTION 'This request has already been confirmed'; END IF;

  v_amount := COALESCE(v_req.quoted_amount, 0);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'The quote amount is not set yet'; END IF;

  INSERT INTO public.orders (
    customer_id, shop_id, status, order_type, payment_method, payment_status,
    subtotal, delivery_fee, tip, discount, total,
    customer_name, customer_phone, delivery_address, delivery_instructions, delivery_pin
  ) VALUES (
    v_uid, v_req.shop_id, 'pending_payment', 'service', COALESCE(v_req.payment_method, 'cash'), 'unpaid',
    v_amount, 0, 0, 0, v_amount,
    v_req.customer_name, v_req.customer_phone, v_req.location, v_req.special_instructions,
    LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0')
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity)
  SELECT v_order_id, NULL, name, NULL, unit_price, quantity
    FROM public.service_request_items WHERE request_id = p_request_id;

  PERFORM set_config('app.service_internal', '1', true);
  UPDATE public.service_requests
     SET order_id = v_order_id, status = 'confirmed', payment_status = 'unpaid'
   WHERE id = p_request_id;
  PERFORM set_config('app.service_internal', '0', true);

  RETURN v_order_id;
END; $fn$;
REVOKE ALL ON FUNCTION public.accept_service_quote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_service_quote(uuid) TO authenticated;

-- 11. cancel_service_request: customer withdraws before confirmation -----------
CREATE OR REPLACE FUNCTION public.cancel_service_request(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.service_requests;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_req FROM public.service_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.customer_id <> v_uid THEN RAISE EXCEPTION 'This request does not belong to you'; END IF;
  IF v_req.status NOT IN ('requested','reviewing','quoted') THEN
    RAISE EXCEPTION 'This request can no longer be cancelled online';
  END IF;

  PERFORM set_config('app.service_internal', '1', true);
  UPDATE public.service_requests
     SET status = 'cancelled', cancelled_at = now()
   WHERE id = p_request_id;
  PERFORM set_config('app.service_internal', '0', true);
END; $fn$;
REVOKE ALL ON FUNCTION public.cancel_service_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_service_request(uuid) TO authenticated;

-- 12. Storage: service imagery lives under services/<service-id>/ in ligo-media
DROP POLICY IF EXISTS media_services_read ON storage.objects;
CREATE POLICY media_services_read ON storage.objects FOR SELECT TO public
USING (bucket_id = 'ligo-media' AND (storage.foldername(name))[1] = 'services');
DROP POLICY IF EXISTS media_services_write ON storage.objects;
CREATE POLICY media_services_write ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ligo-media' AND (storage.foldername(name))[1] = 'services' AND public.is_admin());
DROP POLICY IF EXISTS media_services_update ON storage.objects;
CREATE POLICY media_services_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ligo-media' AND (storage.foldername(name))[1] = 'services' AND public.is_admin())
WITH CHECK (bucket_id = 'ligo-media' AND (storage.foldername(name))[1] = 'services' AND public.is_admin());
DROP POLICY IF EXISTS media_services_delete ON storage.objects;
CREATE POLICY media_services_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ligo-media' AND (storage.foldername(name))[1] = 'services' AND public.is_admin());

-- 13. Realtime for provider/admin request queues -------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 14. Seed the four service categories (idempotent, catalogue content only) ----
INSERT INTO public.service_categories (slug, name, tagline, description, emoji, sort_order) VALUES
  ('surprises', 'Surprises', 'Unforgettable moments, delivered',
   'Surprise experiences and deliveries for birthdays, anniversaries, proposals and more.',
   '🎉', 1),
  ('gifts', 'Gifts', 'Thoughtful gifts, sent with love',
   'Gift boxes, flowers, cakes, personalised presents and custom bundles.',
   '🎁', 2),
  ('catering', 'Catering', 'Food your guests will remember',
   'Catering packages and custom menus for gatherings, offices, weddings and parties.',
   '🍽️', 3),
  ('decoration', 'Decoration', 'Beautiful spaces, beautifully styled',
   'Event and venue decoration for birthdays, weddings, baby showers and corporate events.',
   '🎈', 4)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      emoji = EXCLUDED.emoji,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();