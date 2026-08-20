-- Delivery verification PIN + cancellation/refund metadata
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_pin text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS refunded boolean NOT NULL DEFAULT false;

-- Live rider telemetry for the admin dispatch map
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS speed double precision,
  ADD COLUMN IF NOT EXISTS battery int;

-- Itemized earnings: distance incentive on top of base fare + tip + bonus
ALTER TABLE public.rider_earnings
  ADD COLUMN IF NOT EXISTS distance_km numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_incentive numeric(10,2) NOT NULL DEFAULT 0;

-- Platform pricing knobs (currency kept overrideable for future markets)
UPDATE public.settings
SET value = value || '{"currency":"ETB","distance_rate_per_km":10}'::jsonb
WHERE key = 'platform';

-- Earnings trigger: base fare + distance incentive (haversine shop -> dropoff) + tip
CREATE OR REPLACE FUNCTION public.record_rider_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_lat double precision;
  _shop_lng double precision;
  _distance_km numeric(6,2) := 0;
  _incentive numeric(10,2) := 0;
  _rate numeric(10,2) := 10;
BEGIN
  IF NEW.status <> 'delivered' OR OLD.status = 'delivered' OR NEW.rider_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE((value->>'distance_rate_per_km')::numeric, 10) INTO _rate
  FROM public.settings WHERE key = 'platform';

  SELECT s.lat, s.lng INTO _shop_lat, _shop_lng FROM public.shops s WHERE s.id = NEW.shop_id;
  IF _shop_lat IS NOT NULL AND _shop_lng IS NOT NULL AND NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    _distance_km := round(6371 * 2 * asin(sqrt(
      pow(sin(radians(NEW.lat - _shop_lat) / 2), 2) +
      cos(radians(_shop_lat)) * cos(radians(NEW.lat)) *
      pow(sin(radians(NEW.lng - _shop_lng) / 2), 2)
    ))::numeric, 2);
    _incentive := round(_distance_km * _rate, 2);
  END IF;

  INSERT INTO public.rider_earnings
    (rider_id, order_id, base_fare, tip, bonus, distance_km, distance_incentive, amount)
  VALUES (
    NEW.rider_id,
    NEW.id,
    NEW.delivery_fee,
    COALESCE(NEW.tip, 0),
    0,
    _distance_km,
    _incentive,
    NEW.delivery_fee + COALESCE(NEW.tip, 0) + _incentive
  )
  ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_rider_earning() FROM PUBLIC, anon, authenticated;

-- Rider completes a delivery only with the customer's verification PIN
CREATE OR REPLACE FUNCTION public.complete_delivery(_order_id uuid, _pin text)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
BEGIN
  IF NOT public.has_role(auth.uid(), 'rider') THEN
    RAISE EXCEPTION 'Only riders can complete deliveries';
  END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _order.id IS NULL OR _order.rider_id <> auth.uid() THEN
    RAISE EXCEPTION 'Order is not assigned to you';
  END IF;
  IF _order.status NOT IN ('on_the_way', 'picked_up') THEN
    RAISE EXCEPTION 'Order is not out for delivery';
  END IF;
  IF _order.delivery_pin IS NOT NULL AND _order.delivery_pin <> '' AND _order.delivery_pin <> _pin THEN
    RAISE EXCEPTION 'Incorrect delivery PIN';
  END IF;

  UPDATE public.orders SET status = 'delivered' WHERE id = _order_id RETURNING * INTO _order;
  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text) TO authenticated;
