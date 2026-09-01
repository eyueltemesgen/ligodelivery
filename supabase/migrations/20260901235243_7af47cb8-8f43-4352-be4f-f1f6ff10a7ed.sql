-- enum extension
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'merchant';

-- shops extra columns
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- riders extra columns
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS commission_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS speed double precision,
  ADD COLUMN IF NOT EXISTS battery integer,
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'telebirr',
  ADD COLUMN IF NOT EXISTS payout_account text,
  ADD COLUMN IF NOT EXISTS payout_account_name text;

-- shop hours
CREATE TABLE IF NOT EXISTS public.shop_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
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
CREATE POLICY shop_hours_public_read ON public.shop_hours FOR SELECT TO public USING (true);
CREATE POLICY shop_hours_manage ON public.shop_hours FOR ALL TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE TRIGGER shop_hours_updated BEFORE UPDATE ON public.shop_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payout requests
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  note text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY payouts_select ON public.payout_requests FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin());
CREATE POLICY payouts_insert_own ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (rider_id = auth.uid());
CREATE POLICY payouts_update_admin ON public.payout_requests FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER payout_requests_updated BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- rider earnings
CREATE TABLE IF NOT EXISTS public.rider_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  base_fare numeric NOT NULL DEFAULT 0,
  tip numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  distance_incentive numeric NOT NULL DEFAULT 0,
  distance_km numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payout_request_id uuid REFERENCES public.payout_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
GRANT SELECT, INSERT, UPDATE ON public.rider_earnings TO authenticated;
GRANT ALL ON public.rider_earnings TO service_role;
ALTER TABLE public.rider_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY earnings_select ON public.rider_earnings FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin());
CREATE POLICY earnings_update ON public.rider_earnings FOR UPDATE TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin())
  WITH CHECK (rider_id = auth.uid() OR public.is_admin());
CREATE POLICY earnings_insert_admin ON public.rider_earnings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE TRIGGER rider_earnings_updated BEFORE UPDATE ON public.rider_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- rider ratings
CREATE TABLE IF NOT EXISTS public.rider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.rider_ratings TO authenticated;
GRANT ALL ON public.rider_ratings TO service_role;
ALTER TABLE public.rider_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ratings_select ON public.rider_ratings FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR rider_id = auth.uid() OR public.is_admin());
CREATE POLICY ratings_insert_own ON public.rider_ratings FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

-- rider offer events
CREATE TABLE IF NOT EXISTS public.rider_offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.rider_offer_events TO authenticated;
GRANT ALL ON public.rider_offer_events TO service_role;
ALTER TABLE public.rider_offer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY offer_events_select ON public.rider_offer_events FOR SELECT TO authenticated
  USING (rider_id = auth.uid() OR public.is_admin());
CREATE POLICY offer_events_insert_own ON public.rider_offer_events FOR INSERT TO authenticated
  WITH CHECK (rider_id = auth.uid());

-- auto-create an earnings row when an order is delivered
CREATE OR REPLACE FUNCTION public.create_rider_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND COALESCE(OLD.status,'') <> 'delivered' AND NEW.rider_id IS NOT NULL THEN
    INSERT INTO public.rider_earnings (rider_id, order_id, amount, base_fare)
    VALUES (NEW.rider_id, NEW.id, COALESCE(NEW.delivery_fee,0), COALESCE(NEW.delivery_fee,0))
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_create_earning ON public.orders;
CREATE TRIGGER orders_create_earning AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_rider_earning();

-- realtime
ALTER TABLE public.payout_requests REPLICA IDENTITY FULL;
ALTER TABLE public.rider_earnings REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_earnings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;