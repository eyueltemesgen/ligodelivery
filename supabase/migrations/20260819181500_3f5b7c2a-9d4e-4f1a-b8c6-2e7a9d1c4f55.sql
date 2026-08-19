-- Merchant role for store owners
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'merchant';

-- Order dispatch workflow columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_payout numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Shop online override + merchant ownership
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Rider verification documents
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS license_document_url text;

-- Weekly operating schedule per shop
CREATE TABLE IF NOT EXISTS public.shop_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at time NOT NULL DEFAULT '08:00',
  closes_at time NOT NULL DEFAULT '22:00',
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, day_of_week)
);
GRANT SELECT ON public.shop_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_hours TO authenticated;
GRANT ALL ON public.shop_hours TO service_role;
ALTER TABLE public.shop_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_hours_public_read" ON public.shop_hours FOR SELECT USING (true);
CREATE POLICY "shop_hours_owner_write" ON public.shop_hours FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  );
CREATE TRIGGER shop_hours_updated BEFORE UPDATE ON public.shop_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Merchant store owners can manage their own shop (hours, online toggle, details)
CREATE POLICY "shops_owner_update" ON public.shops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Approved riders can see dispatched orders that have not been accepted yet
CREATE POLICY "orders_select_dispatchable" ON public.orders FOR SELECT TO authenticated
  USING (status = 'dispatched' AND rider_id IS NULL AND public.has_role(auth.uid(), 'rider'));

-- Rider earnings ledger (base fare + tip + bonus per delivery)
CREATE TABLE IF NOT EXISTS public.rider_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  base_fare numeric(10,2) NOT NULL DEFAULT 0,
  tip numeric(10,2) NOT NULL DEFAULT 0,
  bonus numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payout_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rider_earnings_order_uidx ON public.rider_earnings(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS rider_earnings_rider_idx ON public.rider_earnings(rider_id);
GRANT SELECT, UPDATE ON public.rider_earnings TO authenticated;
GRANT ALL ON public.rider_earnings TO service_role;
ALTER TABLE public.rider_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "earnings_select_own" ON public.rider_earnings FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin());
CREATE POLICY "earnings_update_own" ON public.rider_earnings FOR UPDATE TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin()) WITH CHECK (rider_id = auth.uid() OR public.is_admin());

-- Payout / instant cashout requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payout_requests_rider_idx ON public.payout_requests(rider_id);
GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_select" ON public.payout_requests FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin());
CREATE POLICY "payouts_insert_own" ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (rider_id = auth.uid());
CREATE POLICY "payouts_update_admin" ON public.payout_requests FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER payout_requests_updated BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.rider_earnings
  ADD CONSTRAINT rider_earnings_payout_fk FOREIGN KEY (payout_request_id)
  REFERENCES public.payout_requests(id) ON DELETE SET NULL;

-- Customer ratings for riders
CREATE TABLE IF NOT EXISTS public.rider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rider_ratings_rider_idx ON public.rider_ratings(rider_id);
GRANT SELECT, INSERT ON public.rider_ratings TO authenticated;
GRANT ALL ON public.rider_ratings TO service_role;
ALTER TABLE public.rider_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_select" ON public.rider_ratings FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR customer_id = auth.uid() OR public.is_admin());
CREATE POLICY "ratings_insert_customer" ON public.rider_ratings FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid() AND o.rider_id = rider_id AND o.status = 'delivered'
    )
  );

-- Offer accept/decline events feed the acceptance-rate metric
CREATE TABLE IF NOT EXISTS public.rider_offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, rider_id)
);
GRANT SELECT, INSERT ON public.rider_offer_events TO authenticated;
GRANT ALL ON public.rider_offer_events TO service_role;
ALTER TABLE public.rider_offer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_events_select" ON public.rider_offer_events FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin());
CREATE POLICY "offer_events_insert_own" ON public.rider_offer_events FOR INSERT TO authenticated
  WITH CHECK (rider_id = auth.uid());

-- Atomic single-acceptance lock: first approved rider to claim wins
CREATE OR REPLACE FUNCTION public.accept_order(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rider public.riders;
  _order public.orders;
BEGIN
  SELECT * INTO _rider FROM public.riders WHERE id = auth.uid();
  IF _rider.id IS NULL OR NOT _rider.is_approved THEN
    RAISE EXCEPTION 'Only approved riders can accept orders';
  END IF;

  UPDATE public.orders
  SET status = 'accepted',
      rider_id = auth.uid(),
      accepted_at = now(),
      rider_payout = delivery_fee + COALESCE(tip, 0)
  WHERE id = _order_id
    AND status = 'dispatched'
    AND rider_id IS NULL
  RETURNING * INTO _order;

  IF _order.id IS NULL THEN
    RAISE EXCEPTION 'Order is no longer available';
  END IF;

  INSERT INTO public.rider_offer_events (order_id, rider_id, event)
  VALUES (_order_id, auth.uid(), 'accepted')
  ON CONFLICT (order_id, rider_id) DO NOTHING;

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO authenticated;

-- Admin verifies payment and broadcasts the order to all riders
CREATE OR REPLACE FUNCTION public.approve_and_dispatch(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can dispatch orders';
  END IF;

  UPDATE public.orders
  SET status = 'dispatched',
      payment_status = CASE WHEN payment_method = 'cash' THEN payment_status ELSE 'paid' END,
      dispatched_at = now()
  WHERE id = _order_id
    AND status IN ('pending_payment', 'pending', 'payment_verification')
    AND rider_id IS NULL
  RETURNING * INTO _order;

  IF _order.id IS NULL THEN
    RAISE EXCEPTION 'Order is not awaiting payment approval';
  END IF;

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_and_dispatch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_dispatch(uuid) TO authenticated;

-- Record rider earnings when an order is delivered
CREATE OR REPLACE FUNCTION public.record_rider_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' AND NEW.rider_id IS NOT NULL THEN
    INSERT INTO public.rider_earnings (rider_id, order_id, base_fare, tip, bonus, amount)
    VALUES (
      NEW.rider_id,
      NEW.id,
      NEW.delivery_fee,
      COALESCE(NEW.tip, 0),
      0,
      NEW.delivery_fee + COALESCE(NEW.tip, 0)
    )
    ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_rider_earning() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_record_earning ON public.orders;
CREATE TRIGGER orders_record_earning AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.record_rider_earning();

-- Merchant role in signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE bootstrap_done boolean;
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
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Rider verification documents live under rider-docs/<uid>/ in ligo-media
CREATE POLICY "media_rider_docs_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ligo-media'
    AND (storage.foldername(name))[1] = 'rider-docs'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );
CREATE POLICY "media_rider_docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ligo-media'
    AND (storage.foldername(name))[1] = 'rider-docs'
    AND (is_admin() OR (storage.foldername(name))[2] = (auth.uid())::text)
  );

-- Realtime for dispatch broadcast, cashouts and shop online toggles
ALTER PUBLICATION supabase_realtime ADD TABLE public.shops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;
