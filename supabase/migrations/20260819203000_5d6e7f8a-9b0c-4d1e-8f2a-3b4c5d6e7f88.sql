-- Per-rider commission tier (% of delivery fee kept as rider incentive share)
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS commission_tier numeric(5,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS vehicle_registration text;

-- Dispute / cancellation reason log for audit
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid,
  event text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON public.order_events(order_id);
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_events_read" ON public.order_events FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.customer_id = auth.uid() OR o.rider_id = auth.uid())
    )
  );
CREATE POLICY "order_events_insert" ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.is_admin());
