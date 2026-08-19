-- Rider verification workflow + payout details
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'telebirr',
  ADD COLUMN IF NOT EXISTS payout_account text,
  ADD COLUMN IF NOT EXISTS payout_account_name text;

UPDATE public.riders SET verification_status = 'approved' WHERE is_approved;

-- Global platform settings for the admin control center
INSERT INTO public.settings (key, value, is_public) VALUES
  ('platform', '{"commission_percent":15,"base_delivery_fee":50,"surge_multiplier":1,"dispatch_paused":false}', true)
ON CONFLICT (key) DO NOTHING;

-- Merchants can create their own shop (kept inactive until an admin verifies it)
CREATE POLICY "shops_merchant_insert" ON public.shops FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'merchant'));

-- Owners can read their own shop even while it is inactive/pending review
CREATE POLICY "shops_owner_read" ON public.shops FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

-- Only admins (or the service role) can activate/deactivate a shop —
-- merchants cannot self-verify their own storefront
CREATE OR REPLACE FUNCTION public.guard_shop_activation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_active := false;
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS shops_guard_activation ON public.shops;
CREATE TRIGGER shops_guard_activation BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.guard_shop_activation();

-- Merchants can upload logo/cover images for their own shop
CREATE POLICY "media_merchant_shop_images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ligo-media'
    AND (storage.foldername(name))[1] = 'shops'
    AND (public.has_role(auth.uid(), 'merchant') OR is_admin())
  );

-- Respect the global emergency dispatch pause
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
