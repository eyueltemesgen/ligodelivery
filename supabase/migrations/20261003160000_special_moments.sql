-- Special Moments: gifts, surprises, holiday gifts, catering and decoration.
--
-- Additive only. No existing table, row, id or policy is dropped or rewritten.
-- New order types ("service") reuse the existing orders / payment / account
-- infrastructure; product checkout is untouched.

-- =========================================================================
-- 1. Service taxonomy + catalogue
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_categories_public_read ON public.service_categories;
CREATE POLICY service_categories_public_read ON public.service_categories
  FOR SELECT USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS service_categories_admin_write ON public.service_categories;
CREATE POLICY service_categories_admin_write ON public.service_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS service_categories_updated ON public.service_categories;
CREATE TRIGGER service_categories_updated BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  service_category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  occasion text,
  pricing_type text NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'quote')),
  price numeric(10,2),
  starting_price numeric(10,2),
  description text,
  included_items text[] NOT NULL DEFAULT '{}',
  image_url text,
  gallery text[] NOT NULL DEFAULT '{}',
  service_area text,
  lead_time_hours int NOT NULL DEFAULT 24,
  available_from date,
  available_to date,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS services_category_idx ON public.services(service_category_id);
CREATE INDEX IF NOT EXISTS services_shop_idx ON public.services(shop_id);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read ON public.services
  FOR SELECT USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS services_manage ON public.services;
CREATE POLICY services_manage ON public.services FOR ALL TO authenticated
  USING (public.is_admin() OR (shop_id IS NOT NULL AND public.owns_shop(shop_id)))
  WITH CHECK (public.is_admin() OR (shop_id IS NOT NULL AND public.owns_shop(shop_id)));
DROP TRIGGER IF EXISTS services_updated ON public.services;
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_addons_service_idx ON public.service_addons(service_id);
GRANT SELECT ON public.service_addons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_addons TO authenticated;
GRANT ALL ON public.service_addons TO service_role;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_addons_public_read ON public.service_addons;
CREATE POLICY service_addons_public_read ON public.service_addons
  FOR SELECT USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS service_addons_manage ON public.service_addons;
CREATE POLICY service_addons_manage ON public.service_addons FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id
               AND s.shop_id IS NOT NULL AND public.owns_shop(s.shop_id))
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id
               AND s.shop_id IS NOT NULL AND public.owns_shop(s.shop_id))
  );
DROP TRIGGER IF EXISTS service_addons_updated ON public.service_addons;
CREATE TRIGGER service_addons_updated BEFORE UPDATE ON public.service_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. Service requests: bookings, quotes, surprises, catering, decoration
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text NOT NULL UNIQUE DEFAULT ('SM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  user_id uuid NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'booking' CHECK (request_type IN ('booking', 'quote')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'quote_requested', 'quoted', 'accepted', 'confirmed', 'completed', 'cancelled')),
  customer_name text,
  customer_phone text,
  recipient_name text,
  recipient_phone text,
  is_anonymous boolean NOT NULL DEFAULT false,
  occasion text,
  surprise_type text,
  event_type text,
  event_date date,
  event_time time,
  location text,
  guest_count int,
  message text,
  theme text,
  food_preferences text,
  special_instructions text,
  budget numeric(10,2),
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  quote_amount numeric(10,2),
  admin_notes text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_user_idx ON public.service_requests(user_id);
CREATE INDEX IF NOT EXISTS service_requests_service_idx ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests(status);
GRANT SELECT, INSERT, UPDATE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_requests_select ON public.service_requests;
CREATE POLICY service_requests_select ON public.service_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()
         OR (service_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.services s WHERE s.id = service_id
                AND s.shop_id IS NOT NULL AND public.owns_shop(s.shop_id))));
DROP POLICY IF EXISTS service_requests_insert_own ON public.service_requests;
CREATE POLICY service_requests_insert_own ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
-- Customers may only INSERT their own requests. Status, quote and order linkage
-- are changed exclusively through the SECURITY DEFINER RPCs below, so a client
-- cannot self-approve a quote or mark a request paid by writing the row.
DROP POLICY IF EXISTS service_requests_update ON public.service_requests;
CREATE POLICY service_requests_update ON public.service_requests FOR UPDATE TO authenticated
  USING (public.is_admin()
         OR (service_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.services s WHERE s.id = service_id
                AND s.shop_id IS NOT NULL AND public.owns_shop(s.shop_id))))
  WITH CHECK (public.is_admin()
         OR (service_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.services s WHERE s.id = service_id
                AND s.shop_id IS NOT NULL AND public.owns_shop(s.shop_id))));
DROP TRIGGER IF EXISTS service_requests_updated ON public.service_requests;
CREATE TRIGGER service_requests_updated BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. Orders gain a service type + schedule. Existing product orders default
--    to 'product', so nothing changes for them.
-- =========================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS service_request_id uuid REFERENCES public.service_requests(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('product', 'service'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 4. Seed the five Special Moments categories (taxonomy only — no fake
--    providers). Admin manages services and can rename/reorder these.
-- =========================================================================

INSERT INTO public.service_categories (slug, name, tagline, description, sort_order) VALUES
  ('surprises', 'Surprises', 'Unforgettable moments, delivered',
   'Birthday, anniversary, graduation, proposal, welcome and celebration surprises arranged end to end.', 1),
  ('gifts', 'Gifts', 'Thoughtful gifts for every occasion',
   'Gift boxes, flowers, cakes, chocolates, perfume, personalised gifts, cards and curated bundles.', 2),
  ('holiday-gifts', 'Holiday Gifts', 'Seasonal and holiday gifting',
   'Admin-managed holiday gift campaigns for Christmas, Eid, Easter, New Year, Timket, Meskel and more.', 3),
  ('catering', 'Catering', 'Food for gatherings of every size',
   'Birthday, family, corporate, wedding, graduation and party catering with fixed packages or custom quotes.', 4),
  ('decoration', 'Decoration', 'Beautiful spaces for special events',
   'Birthday, wedding, engagement, graduation, baby shower, balloon, flower, table and venue decoration.', 5)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- 5. RPCs
-- =========================================================================

-- Admin reviews a request: set status, price a quote, leave notes.
CREATE OR REPLACE FUNCTION public.review_service_request(
  p_request uuid, p_status text, p_quote_amount numeric DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE r public.service_requests;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_status NOT IN ('submitted','quote_requested','quoted','accepted','confirmed','completed','cancelled')
    THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO r FROM public.service_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  UPDATE public.service_requests
     SET status = p_status,
         quote_amount = COALESCE(p_quote_amount, quote_amount),
         admin_notes = COALESCE(NULLIF(btrim(p_notes), ''), admin_notes)
   WHERE id = p_request;
  INSERT INTO public.notifications(user_id, title, body, type, order_id)
  VALUES (r.user_id,
    CASE p_status
      WHEN 'quoted' THEN 'Your quote is ready'
      WHEN 'confirmed' THEN 'Your booking is confirmed'
      WHEN 'completed' THEN 'Your Special Moments service is complete'
      WHEN 'cancelled' THEN 'Your request was cancelled'
      ELSE 'Your request was updated'
    END,
    CASE p_status
      WHEN 'quoted' THEN 'Review your quote for ' || COALESCE(r.request_code, 'your request') || ' and accept it to continue to payment.'
      WHEN 'confirmed' THEN 'We have confirmed ' || COALESCE(r.request_code, 'your request') || '.'
      ELSE 'Your Special Moments request ' || COALESCE(r.request_code, '') || ' is now ' || p_status || '.'
    END,
    'service', r.order_id);
END; $$;
REVOKE ALL ON FUNCTION public.review_service_request(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_service_request(uuid, text, numeric, text) TO authenticated;

-- Customer accepts a quote so it becomes payable through the existing flow.
CREATE OR REPLACE FUNCTION public.accept_service_quote(p_request uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE r public.service_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT * INTO r FROM public.service_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not your request'; END IF;
  IF r.status <> 'quoted' OR r.quote_amount IS NULL THEN RAISE EXCEPTION 'Nothing to accept yet'; END IF;
  UPDATE public.service_requests SET status = 'accepted' WHERE id = p_request;
END; $$;
REVOKE ALL ON FUNCTION public.accept_service_quote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_service_quote(uuid) TO authenticated;

-- Place a service order through the existing order + payment pipeline.
-- Fixed-price bookings pay the service price; quote requests pay the accepted
-- quote. Both may include selected add-ons.
CREATE OR REPLACE FUNCTION public.place_service_order(
  p_request_id uuid,
  p_payment_method text DEFAULT 'cash',
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_instructions text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.service_requests;
  v_svc public.services;
  v_method text := COALESCE(p_payment_method, 'cash');
  v_base_fee numeric := 50; v_surge numeric := 1; v_fee numeric;
  v_unit numeric := 0; v_order uuid; v_addons numeric := 0; v_scheduled timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_method NOT IN ('cash','mobile_money','telebirr','cbe','chapa','boa') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT * INTO v_req FROM public.service_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.user_id <> v_uid THEN RAISE EXCEPTION 'Not your request'; END IF;
  IF v_req.order_id IS NOT NULL THEN RAISE EXCEPTION 'This request already has an order'; END IF;
  IF v_req.status NOT IN ('submitted','quote_requested','quoted','accepted') THEN
    RAISE EXCEPTION 'Request is not payable';
  END IF;

  SELECT * INTO v_svc FROM public.services WHERE id = v_req.service_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service not found'; END IF;

  SELECT COALESCE((s.value->>'base_delivery_fee')::numeric, 50),
         GREATEST(COALESCE((s.value->>'surge_multiplier')::numeric, 1), 1)
    INTO v_base_fee, v_surge FROM public.settings s WHERE s.key = 'platform';
  v_base_fee := COALESCE(v_base_fee, 50); v_surge := COALESCE(v_surge, 1);

  IF v_req.quote_amount IS NOT NULL THEN
    v_unit := v_req.quote_amount;
  ELSIF v_svc.pricing_type = 'fixed' AND v_svc.price IS NOT NULL THEN
    v_unit := v_svc.price;
  ELSE
    RAISE EXCEPTION 'This service needs an accepted quote before payment';
  END IF;

  SELECT COALESCE(SUM((a->>'price')::numeric), 0) INTO v_addons
    FROM jsonb_array_elements(COALESCE(v_req.addons, '[]'::jsonb)) a;
  v_unit := v_unit + v_addons;

  IF v_svc.shop_id IS NOT NULL THEN
    SELECT ROUND(COALESCE(sh.delivery_fee, v_base_fee) * v_surge) INTO v_fee
      FROM public.shops sh WHERE sh.id = v_svc.shop_id;
  END IF;
  v_fee := COALESCE(v_fee, ROUND(v_base_fee * v_surge));

  IF v_req.event_date IS NOT NULL THEN
    v_scheduled := (v_req.event_date::text || ' ' || COALESCE(v_req.event_time::text, '12:00:00'))::timestamptz;
  END IF;

  INSERT INTO public.orders (
    customer_id, shop_id, order_type, status, payment_method, payment_status,
    subtotal, delivery_fee, discount, total,
    customer_name, customer_phone, delivery_address, delivery_instructions,
    scheduled_for, service_request_id, delivery_pin)
  VALUES (
    v_uid, v_svc.shop_id, 'service', 'pending_payment', v_method, 'unpaid',
    v_unit, v_fee, 0, GREATEST(v_unit + v_fee, 0),
    COALESCE(NULLIF(btrim(p_customer_name), ''), v_req.customer_name),
    COALESCE(NULLIF(btrim(p_customer_phone), ''), v_req.customer_phone),
    COALESCE(NULLIF(btrim(p_delivery_address), ''), v_req.location),
    COALESCE(NULLIF(btrim(p_delivery_instructions), ''), v_req.special_instructions),
    v_scheduled, p_request_id,
    LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0'))
  RETURNING id INTO v_order;

  INSERT INTO public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity)
  VALUES (v_order, NULL, v_svc.name, v_svc.image_url, v_unit, 1);

  UPDATE public.service_requests
     SET status = 'confirmed', order_id = v_order
   WHERE id = p_request_id;

  INSERT INTO public.notifications(user_id, title, body, type, order_id)
  VALUES (v_uid, 'Special Moments order placed',
          v_svc.name || ' (' || COALESCE(v_req.request_code, '') || ') is awaiting payment confirmation.',
          'service', v_order);

  RETURN v_order;
END; $$;
REVOKE ALL ON FUNCTION public.place_service_order(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_service_order(uuid, text, text, text, text, text) TO authenticated;

-- =========================================================================
-- 6. Realtime for admin request queue (safe if already added).
-- =========================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
