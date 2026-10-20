-- Customers were never told when their order was accepted, prepared or delivered.
--
-- `merchant.tsx` and `rider.index.tsx` both called the client `notify()` helper,
-- which inserts straight into `public.notifications`. The only INSERT policy is
-- `WITH CHECK (user_id = auth.uid() OR public.is_admin())`, and neither a shop
-- owner nor a rider is the customer, so RLS rejected the row. The helpers do not
-- check the error, so it failed silently: the customer saw "Confirmed" forever
-- while their food sat ready at the counter.
--
-- A policy cannot simply allow `user_id <> auth.uid()` -- that would let any
-- signed-in user push arbitrary notifications at anyone. Instead this adds a
-- SECURITY DEFINER RPC that resolves the caller's relationship to the order
-- first, and the client is switched over to it. Same shape as the existing
-- accept_order / complete_delivery / review_service_request RPCs.

CREATE OR REPLACE FUNCTION public.notify_order_status(
  _order_id uuid,
  _title text,
  _body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order public.orders;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002';
  END IF;

  -- The caller must have a legitimate hand in fulfilling this order. Admins keep
  -- their existing bypass; otherwise it is the shop's owner or its assigned rider.
  IF NOT (
    public.is_admin()
    OR public.owns_shop(_order.shop_id)
    OR (
      _order.rider_id = _uid
      AND public.has_role(_uid, 'rider')
    )
  ) THEN
    RAISE EXCEPTION 'not allowed to notify on this order' USING ERRCODE = '42501';
  END IF;

  -- Only the order's own customer is ever notified, so a shop cannot use this to
  -- reach someone who never ordered from them.
  IF _order.customer_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, order_id)
  VALUES (
    _order.customer_id,
    left(coalesce(_title, 'Order update'), 120),
    left(coalesce(_body, ''), 400),
    'order',
    _order_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_order_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_order_status(uuid, text, text) TO authenticated;
