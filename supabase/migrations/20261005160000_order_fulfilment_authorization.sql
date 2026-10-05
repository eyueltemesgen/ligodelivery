-- Order fulfilment authorization (payment-first hardening).
--
-- 20261005120000 blocked a rider or merchant from advancing an *unpaid
-- non-cash* order, but it left two holes:
--
-- 1. Cash orders were exempt from the payment gate and the guard never checked
--    *who* was writing the status, so any authenticated customer could PATCH
--    their own order straight to 'delivered' and collect commission/payouts for
--    an order nobody fulfilled. Verified live: a customer self-delivered a cash
--    order (rider_id NULL, payment_status 'unpaid').
-- 2. Non-admin status changes were only bounded by a column list, so a customer
--    could also self-advance to 'dispatched' / 'accepted' / 'on_the_way'.
--
-- This adds an explicit actor + transition check for every non-admin status
-- write. Admin flows (approve_and_dispatch) and the SECURITY DEFINER RPCs
-- (accept_order, complete_delivery) keep working because they either run as an
-- admin or set app.order_internal.
--
-- Additive and idempotent. Apply before deploying the matching app build.

CREATE OR REPLACE FUNCTION public.orders_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_from text := OLD.status;
  v_to text := NEW.status;
BEGIN
  -- Internal SECURITY DEFINER flows (accept_order, complete_delivery,
  -- approve_and_dispatch) set this flag; admins may override anything.
  IF current_setting('app.order_internal', true) = '1' THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;

  -- Only the status may change for a non-admin; pricing, payment and
  -- assignment columns are server-owned.
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

  -- Payment gate: a non-cash order must be paid before it can move forward.
  -- Cash-on-delivery is settled in person, so it needs no up-front payment —
  -- the actor check below is what stops a customer self-fulfilling it.
  IF v_to IS DISTINCT FROM v_from
     AND v_to <> 'cancelled'
     AND COALESCE(NEW.payment_method, 'cash') <> 'cash'
     AND COALESCE(NEW.payment_status, 'unpaid') <> 'paid' THEN
    RAISE EXCEPTION 'Payment must be verified before this order can be fulfilled';
  END IF;

  IF v_to IS DISTINCT FROM v_from THEN
    -- Anyone involved may always back out of an order they own or fulfil.
    IF v_to = 'cancelled' THEN
      IF NOT (OLD.customer_id = auth.uid() OR public.owns_shop(OLD.shop_id)) THEN
        RAISE EXCEPTION 'Only the customer or merchant can cancel this order';
      END IF;
    ELSIF v_to IN ('confirmed', 'preparing', 'ready_for_pickup') THEN
      -- Kitchen/fulfilment stages belong to the merchant.
      IF NOT public.owns_shop(OLD.shop_id) THEN
        RAISE EXCEPTION 'Only the merchant can move this order to %', v_to;
      END IF;
    ELSIF v_to IN ('accepted', 'arrived_at_merchant', 'picked_up', 'on_the_way') THEN
      -- In-progress stages belong to the rider the order is assigned to.
      IF OLD.rider_id IS DISTINCT FROM auth.uid()
         OR NOT public.has_role(auth.uid(), 'rider') THEN
        RAISE EXCEPTION 'Only the assigned rider can update this delivery';
      END IF;
    ELSIF v_to = 'delivered' THEN
      RAISE EXCEPTION 'Deliveries are completed with the customer PIN';
    ELSE
      RAISE EXCEPTION 'Order fulfilment is controlled by the platform';
    END IF;
  END IF;

  -- Commission is computed by orders_apply_commission, never by the caller.
  NEW.commission_percent := OLD.commission_percent;
  NEW.commission_amount := OLD.commission_amount;
  NEW.merchant_net := OLD.merchant_net;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.orders_guard_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
CREATE TRIGGER orders_guard_update BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_update();
