-- 1. Merchant profiles / applications
CREATE TABLE IF NOT EXISTS public.merchant_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  contact_phone text,
  contact_email text,
  business_name text NOT NULL,
  business_description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  business_phone text,
  address text,
  city text NOT NULL DEFAULT 'Bishoftu',
  lat double precision,
  lng double precision,
  opens_at time NOT NULL DEFAULT '08:00',
  closes_at time NOT NULL DEFAULT '22:00',
  logo_url text,
  cover_url text,
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  commission_percent numeric(5,2),
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_status_valid CHECK (status IN ('pending','under_review','approved','rejected','suspended'))
);
CREATE INDEX IF NOT EXISTS merchant_profiles_status_idx ON public.merchant_profiles(status);
CREATE INDEX IF NOT EXISTS merchant_profiles_shop_idx ON public.merchant_profiles(shop_id);
DROP TRIGGER IF EXISTS merchant_profiles_updated ON public.merchant_profiles;
CREATE TRIGGER merchant_profiles_updated BEFORE UPDATE ON public.merchant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Payouts
CREATE TABLE IF NOT EXISTS public.merchant_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  period_start date,
  period_end date,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reference text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_payout_status_valid CHECK (status IN ('pending','processing','paid','failed'))
);
CREATE INDEX IF NOT EXISTS merchant_payouts_merchant_idx ON public.merchant_payouts(merchant_id);

-- 3. Promotions (Ligo Ads)
CREATE TABLE IF NOT EXISTS public.merchant_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'featured_shop',
  message text,
  status text NOT NULL DEFAULT 'pending',
  price numeric(10,2),
  admin_notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_promo_kind_valid CHECK (kind IN ('featured_shop','featured_product','homepage')),
  CONSTRAINT merchant_promo_status_valid CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX IF NOT EXISTS merchant_promotions_merchant_idx ON public.merchant_promotions(merchant_id);

-- 4. Order commission columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merchant_net numeric(10,2) NOT NULL DEFAULT 0;

INSERT INTO public.settings(key, value)
VALUES ('commission', '{"merchant_percent": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Helpers
CREATE OR REPLACE FUNCTION public.is_approved_merchant(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.merchant_profiles m WHERE m.id = _uid AND m.status = 'approved')
$$;
REVOKE ALL ON FUNCTION public.is_approved_merchant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_merchant(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.owns_shop(_shop uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = _shop AND s.owner_id = auth.uid()
      AND public.is_approved_merchant(auth.uid())
  )
$$;
REVOKE ALL ON FUNCTION public.owns_shop(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_shop(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.merchant_commission_percent(_uid uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT m.commission_percent FROM public.merchant_profiles m WHERE m.id = _uid),
    COALESCE(((SELECT value FROM public.settings WHERE key = 'commission')->>'merchant_percent')::numeric, 10)
  )
$$;
REVOKE ALL ON FUNCTION public.merchant_commission_percent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_commission_percent(uuid) TO authenticated;

-- 6. Commission computed server-side when an order is delivered
CREATE OR REPLACE FUNCTION public.orders_apply_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pct numeric; owner uuid;
BEGIN
  IF NEW.status = 'delivered' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'delivered') THEN
    SELECT s.owner_id INTO owner FROM public.shops s WHERE s.id = NEW.shop_id;
    pct := public.merchant_commission_percent(owner);
    NEW.commission_percent := pct;
    NEW.commission_amount := ROUND(COALESCE(NEW.subtotal,0) * pct / 100.0, 2);
    NEW.merchant_net := ROUND(COALESCE(NEW.subtotal,0) - NEW.commission_amount, 2);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.orders_apply_commission() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.orders_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
     OR NEW.order_code IS DISTINCT FROM OLD.order_code THEN
    RAISE EXCEPTION 'Only the order status can be updated';
  END IF;
  NEW.commission_percent := OLD.commission_percent;
  NEW.commission_amount := OLD.commission_amount;
  NEW.merchant_net := OLD.merchant_net;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.orders_guard_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
CREATE TRIGGER orders_guard_update BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_update();
DROP TRIGGER IF EXISTS orders_apply_commission ON public.orders;
DROP TRIGGER IF EXISTS orders_zz_apply_commission ON public.orders;
CREATE TRIGGER orders_zz_apply_commission BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_apply_commission();

-- 7. Merchant profile guard
CREATE OR REPLACE FUNCTION public.merchant_profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('app.merchant_internal', true) = '1' OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.commission_percent := NULL;
    NEW.shop_id := NULL;
    NEW.review_notes := NULL;
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.commission_percent := OLD.commission_percent;
  NEW.shop_id := OLD.shop_id;
  NEW.review_notes := OLD.review_notes;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.merchant_profiles_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS merchant_profiles_guard ON public.merchant_profiles;
CREATE TRIGGER merchant_profiles_guard BEFORE INSERT OR UPDATE ON public.merchant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.merchant_profiles_guard();

-- 8. Grants + RLS
GRANT SELECT, INSERT, UPDATE ON public.merchant_profiles TO authenticated;
GRANT ALL ON public.merchant_profiles TO service_role;
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merchant_profiles_self ON public.merchant_profiles;
CREATE POLICY merchant_profiles_self ON public.merchant_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS merchant_profiles_insert ON public.merchant_profiles;
CREATE POLICY merchant_profiles_insert ON public.merchant_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS merchant_profiles_update ON public.merchant_profiles;
CREATE POLICY merchant_profiles_update ON public.merchant_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_payouts TO authenticated;
GRANT ALL ON public.merchant_payouts TO service_role;
ALTER TABLE public.merchant_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merchant_payouts_read ON public.merchant_payouts;
CREATE POLICY merchant_payouts_read ON public.merchant_payouts FOR SELECT TO authenticated
  USING (merchant_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS merchant_payouts_admin ON public.merchant_payouts;
CREATE POLICY merchant_payouts_admin ON public.merchant_payouts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_promotions TO authenticated;
GRANT ALL ON public.merchant_promotions TO service_role;
ALTER TABLE public.merchant_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merchant_promotions_read ON public.merchant_promotions;
CREATE POLICY merchant_promotions_read ON public.merchant_promotions FOR SELECT TO authenticated
  USING (merchant_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS merchant_promotions_insert ON public.merchant_promotions;
CREATE POLICY merchant_promotions_insert ON public.merchant_promotions FOR INSERT TO authenticated
  WITH CHECK ((merchant_id = auth.uid() AND status = 'pending') OR public.is_admin());
DROP POLICY IF EXISTS merchant_promotions_admin ON public.merchant_promotions;
CREATE POLICY merchant_promotions_admin ON public.merchant_promotions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. Merchant write access to their own shop / products / hours / offers
DROP POLICY IF EXISTS shops_owner_read ON public.shops;
CREATE POLICY shops_owner_read ON public.shops FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
DROP POLICY IF EXISTS shops_owner_update ON public.shops;
CREATE POLICY shops_owner_update ON public.shops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.is_approved_merchant(auth.uid()))
  WITH CHECK (owner_id = auth.uid() AND public.is_approved_merchant(auth.uid()));

CREATE OR REPLACE FUNCTION public.shops_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.is_admin() OR current_setting('app.merchant_internal', true) = '1' THEN RETURN NEW; END IF;
  NEW.owner_id := OLD.owner_id;
  NEW.is_active := OLD.is_active;
  NEW.is_featured := OLD.is_featured;
  NEW.rating := OLD.rating;
  NEW.delivery_fee := OLD.delivery_fee;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.shops_guard_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS shops_guard_update ON public.shops;
CREATE TRIGGER shops_guard_update BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.shops_guard_update();

DROP POLICY IF EXISTS products_owner_all ON public.products;
CREATE POLICY products_owner_all ON public.products FOR ALL TO authenticated
  USING (public.owns_shop(shop_id)) WITH CHECK (public.owns_shop(shop_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_hours TO authenticated;
DROP POLICY IF EXISTS shop_hours_owner_all ON public.shop_hours;
CREATE POLICY shop_hours_owner_all ON public.shop_hours FOR ALL TO authenticated
  USING (public.owns_shop(shop_id)) WITH CHECK (public.owns_shop(shop_id));

DROP POLICY IF EXISTS offers_owner_all ON public.offers;
CREATE POLICY offers_owner_all ON public.offers FOR ALL TO authenticated
  USING (public.owns_shop(shop_id)) WITH CHECK (public.owns_shop(shop_id));

DROP POLICY IF EXISTS orders_merchant_select ON public.orders;
CREATE POLICY orders_merchant_select ON public.orders FOR SELECT TO authenticated
  USING (public.owns_shop(shop_id));
DROP POLICY IF EXISTS orders_merchant_update ON public.orders;
CREATE POLICY orders_merchant_update ON public.orders FOR UPDATE TO authenticated
  USING (public.owns_shop(shop_id)) WITH CHECK (public.owns_shop(shop_id));

DROP POLICY IF EXISTS order_items_merchant_select ON public.order_items;
CREATE POLICY order_items_merchant_select ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.owns_shop(o.shop_id)));

-- 10. Application + review RPCs
CREATE OR REPLACE FUNCTION public.submit_merchant_application(
  _owner_name text, _contact_phone text, _business_name text, _business_description text,
  _category_id uuid, _business_phone text, _address text, _city text,
  _lat double precision, _lng double precision, _opens_at time, _closes_at time,
  _logo_url text, _cover_url text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); em text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT email INTO em FROM auth.users WHERE id = uid;
  PERFORM set_config('app.merchant_internal', '1', true);
  INSERT INTO public.merchant_profiles(
    id, owner_name, contact_phone, contact_email, business_name, business_description,
    category_id, business_phone, address, city, lat, lng, opens_at, closes_at,
    logo_url, cover_url, status, terms_accepted_at)
  VALUES (uid, _owner_name, _contact_phone, em, _business_name, _business_description,
    _category_id, _business_phone, _address, COALESCE(NULLIF(_city,''),'Bishoftu'), _lat, _lng,
    COALESCE(_opens_at,'08:00'), COALESCE(_closes_at,'22:00'), _logo_url, _cover_url, 'pending', now())
  ON CONFLICT (id) DO UPDATE SET
    owner_name = EXCLUDED.owner_name, contact_phone = EXCLUDED.contact_phone,
    business_name = EXCLUDED.business_name, business_description = EXCLUDED.business_description,
    category_id = EXCLUDED.category_id, business_phone = EXCLUDED.business_phone,
    address = EXCLUDED.address, city = EXCLUDED.city, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
    opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
    logo_url = EXCLUDED.logo_url, cover_url = EXCLUDED.cover_url,
    status = CASE WHEN public.merchant_profiles.status IN ('rejected','pending','under_review')
                  THEN 'pending' ELSE public.merchant_profiles.status END,
    terms_accepted_at = now();
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'merchant') ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications(user_id, title, body, type)
  SELECT ur.user_id, 'New merchant application', _business_name || ' applied to sell on Ligo.', 'merchant'
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN uid;
END; $$;
REVOKE ALL ON FUNCTION public.submit_merchant_application(text,text,text,text,uuid,text,text,text,double precision,double precision,time,time,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_merchant_application(text,text,text,text,uuid,text,text,text,double precision,double precision,time,time,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_merchant(_merchant uuid, _status text, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m public.merchant_profiles; sid uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _status NOT IN ('pending','under_review','approved','rejected','suspended') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  SELECT * INTO m FROM public.merchant_profiles WHERE id = _merchant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Merchant not found'; END IF;
  PERFORM set_config('app.merchant_internal', '1', true);
  sid := m.shop_id;
  IF _status = 'approved' THEN
    IF sid IS NULL THEN
      INSERT INTO public.shops(name, description, category_id, phone, address, lat, lng,
        image_url, cover_url, opens_at, closes_at, is_active, is_online, owner_id)
      VALUES (m.business_name, m.business_description, m.category_id, m.business_phone, m.address,
        m.lat, m.lng, m.logo_url, m.cover_url, m.opens_at, m.closes_at, true, true, m.id)
      RETURNING id INTO sid;
    ELSE
      UPDATE public.shops SET is_active = true, owner_id = m.id WHERE id = sid;
    END IF;
  ELSIF _status IN ('rejected','suspended') AND sid IS NOT NULL THEN
    UPDATE public.shops SET is_active = false WHERE id = sid;
  END IF;
  UPDATE public.merchant_profiles
     SET status = _status, review_notes = _notes, shop_id = sid
   WHERE id = _merchant;
  INSERT INTO public.notifications(user_id, title, body, type)
  VALUES (_merchant, 'Merchant application ' || _status,
          COALESCE(_notes, 'Your Ligo merchant account status is now ' || _status || '.'), 'merchant');
END; $$;
REVOKE ALL ON FUNCTION public.review_merchant(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_merchant(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_merchant_commission(_merchant uuid, _percent numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  PERFORM set_config('app.merchant_internal', '1', true);
  UPDATE public.merchant_profiles SET commission_percent = _percent WHERE id = _merchant;
END; $$;
REVOKE ALL ON FUNCTION public.set_merchant_commission(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_merchant_commission(uuid,numeric) TO authenticated;

ALTER TABLE public.merchant_profiles REPLICA IDENTITY FULL;