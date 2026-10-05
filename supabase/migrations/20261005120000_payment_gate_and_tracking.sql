-- Payment gate + customer order tracking.
--
-- Two problems this fixes:
--
-- 1. Orders were being fulfilled without payment. `orders_guard_update` only
--    compared a fixed column list, so any non-admin (a rider, a merchant) could
--    still write `status` straight to 'dispatched' / 'delivered' on an unpaid
--    order, and `approve_and_dispatch` dispatched non-cash orders without ever
--    checking that payment had been verified.
--
-- 2. Customers could not see the rider on the live map. The `riders_select`
--    policy only allowed a rider to read their own row (or an admin), so the
--    order page's `riders` query returned null and the marker never appeared.
--
-- Additive and idempotent. Apply before deploying the matching app build.

-- ---------------------------------------------------------------------------
-- 1. Order status guard: payment must be settled before fulfilment starts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.orders_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Internal SECURITY DEFINER flows (accept_order, complete_delivery, dispatch)
  -- set this flag; admins may override anything.
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

  -- Payment gate. A non-admin may only advance an order once it is paid, or
  -- when it is a cash-on-delivery order (settled in person at the door). The
  -- only exception is cancellation, so a customer or merchant can always back
  -- out of an unpaid order. This blocks a rider or merchant from self-advancing
  -- an unpaid order to 'dispatched' / 'delivered'.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'cancelled'
     AND COALESCE(NEW.payment_method, 'cash') <> 'cash'
     AND COALESCE(NEW.payment_status, 'unpaid') <> 'paid' THEN
    RAISE EXCEPTION 'Payment must be verified before this order can be fulfilled';
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

-- ---------------------------------------------------------------------------
-- 2. accept_order: claiming an order changes `rider_id`, which the column
--    guard forbids for non-admins, so the internal flag is required here too.
--    Only paid (or cash-on-delivery) orders are ever dispatched, so the claim
--    itself needs no extra payment check.
--    DROP first: the live function returns void, and CREATE OR REPLACE cannot
--    change a return type.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.accept_order(uuid);
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

  PERFORM set_config('app.order_internal', '1', true);

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
  ON CONFLICT (order_id, rider_id) DO UPDATE SET event = 'accepted';

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. approve_and_dispatch: admin verification is the payment gate.
--    Non-cash orders must have payment_status = 'paid' (set by the admin's
--    "Mark paid" action or a receipt approval) before they can be dispatched.
--    DROP first: the live function returns void, and CREATE OR REPLACE cannot
--    change a return type.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.approve_and_dispatch(uuid);
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

  IF EXISTS (
    SELECT 1 FROM public.settings
    WHERE key = 'platform' AND COALESCE((value->>'dispatch_paused')::boolean, false)
  ) THEN
    RAISE EXCEPTION 'Dispatch is currently paused platform-wide';
  END IF;

  -- Bypass the column guard for this internal, admin-verified update.
  PERFORM set_config('app.order_internal', '1', true);

  UPDATE public.orders
  SET status = 'dispatched',
      payment_status = CASE WHEN payment_method = 'cash' THEN payment_status ELSE 'paid' END,
      dispatched_at = now(),
      rider_id = NULL
  WHERE id = _order_id
    AND status IN ('pending_payment', 'pending', 'payment_verification')
    AND rider_id IS NULL
    AND (
      payment_method = 'cash'
      OR COALESCE(payment_status, 'unpaid') = 'paid'
    )
  RETURNING * INTO _order;

  IF _order.id IS NULL THEN
    -- Distinguish "payment not verified" from "already dispatched" so the admin
    -- gets an actionable message instead of a generic failure.
    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = _order_id
        AND status IN ('pending_payment', 'pending', 'payment_verification')
        AND COALESCE(payment_method, 'cash') <> 'cash'
        AND COALESCE(payment_status, 'unpaid') <> 'paid'
    ) THEN
      RAISE EXCEPTION 'Payment has not been verified for this order';
    END IF;
    RAISE EXCEPTION 'Order is not awaiting payment approval';
  END IF;

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_and_dispatch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_dispatch(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. complete_delivery: record the internal flag (so the new payment gate does
--    not block the rider) and settle cash on delivery. Non-cash orders must be
--    paid before a rider can complete them.
--    DROP first: the live function returns void, and CREATE OR REPLACE cannot
--    change a return type.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.complete_delivery(uuid, text);
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
  IF COALESCE(_order.payment_method, 'cash') <> 'cash'
     AND COALESCE(_order.payment_status, 'unpaid') <> 'paid' THEN
    RAISE EXCEPTION 'Payment has not been verified for this order';
  END IF;
  IF _order.delivery_pin IS NOT NULL AND _order.delivery_pin <> '' AND _order.delivery_pin <> _pin THEN
    RAISE EXCEPTION 'Incorrect delivery PIN';
  END IF;

  PERFORM set_config('app.order_internal', '1', true);

  UPDATE public.orders
  SET status = 'delivered',
      payment_status = CASE WHEN payment_method = 'cash' THEN 'paid' ELSE payment_status END
  WHERE id = _order_id
  RETURNING * INTO _order;

  RETURN _order;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Customers may read the rider assigned to their own order (live tracking).
--    The order page resolves order.rider_id → riders row; without this the
--    query returned null and the map never showed the rider.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "riders_select_assigned" ON public.riders;
CREATE POLICY "riders_select_assigned" ON public.riders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.rider_id = public.riders.id
        AND o.customer_id = auth.uid()
    )
  );

-- Rider location changes need to reach the customer in realtime. `riders` is
-- already in the supabase_realtime publication, but make it idempotent here too.
ALTER TABLE public.riders REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
