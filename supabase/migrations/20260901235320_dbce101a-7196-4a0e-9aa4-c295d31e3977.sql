ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tip numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rider_payout numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_pin text,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS license_document_url text;

CREATE UNIQUE INDEX IF NOT EXISTS rider_offer_events_order_rider_key
  ON public.rider_offer_events (order_id, rider_id);

-- approved riders may see unclaimed dispatched orders
DROP POLICY IF EXISTS orders_select_dispatch_pool ON public.orders;
CREATE POLICY orders_select_dispatch_pool ON public.orders FOR SELECT TO authenticated
  USING (
    status = 'dispatched' AND rider_id IS NULL
    AND EXISTS (SELECT 1 FROM public.riders r WHERE r.id = auth.uid() AND r.is_approved)
  );

-- admin dispatch
CREATE OR REPLACE FUNCTION public.approve_and_dispatch(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can dispatch orders';
  END IF;
  UPDATE public.orders
     SET status = 'dispatched', dispatched_at = now(), rider_id = NULL
   WHERE id = _order_id;
END; $$;

-- rider claims an order (first come, first served)
CREATE OR REPLACE FUNCTION public.accept_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE claimed uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.riders r WHERE r.id = auth.uid() AND r.is_approved) THEN
    RAISE EXCEPTION 'Not an approved rider';
  END IF;
  UPDATE public.orders
     SET rider_id = auth.uid(), status = 'accepted'
   WHERE id = _order_id AND rider_id IS NULL AND status = 'dispatched'
  RETURNING id INTO claimed;
  IF claimed IS NULL THEN
    RAISE EXCEPTION 'Order already taken';
  END IF;
  INSERT INTO public.rider_offer_events (rider_id, order_id, event)
  VALUES (auth.uid(), _order_id, 'accepted')
  ON CONFLICT (order_id, rider_id) DO UPDATE SET event = 'accepted';
END; $$;

-- rider completes delivery with the customer PIN
CREATE OR REPLACE FUNCTION public.complete_delivery(_order_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.rider_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not your delivery';
  END IF;
  IF o.delivery_pin IS NOT NULL AND o.delivery_pin <> _pin THEN
    RAISE EXCEPTION 'Incorrect delivery PIN';
  END IF;
  UPDATE public.orders
     SET status = 'delivered',
         payment_status = CASE WHEN payment_method = 'cash' THEN 'paid' ELSE payment_status END
   WHERE id = _order_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_rider_earning() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_and_dispatch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_order(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_dispatch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text) TO authenticated;