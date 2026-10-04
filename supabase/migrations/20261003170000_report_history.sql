-- Report history for the admin Reports system.
--
-- Additive and idempotent. Records a lightweight audit trail of generated and
-- exported reports so the admin can see what was produced, when and by whom.
-- Only admins may read or write rows: the app inserts through the admin's own
-- authenticated session, and the RLS policies below enforce the same rule at
-- the database level. Reads degrade gracefully in the app when this table has
-- not been applied yet.

CREATE TABLE IF NOT EXISTS public.report_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL DEFAULT 'Business Report',
  range_label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  export_type text NOT NULL DEFAULT 'view',
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_history_created_idx ON public.report_history(created_at DESC);

GRANT SELECT, INSERT ON public.report_history TO authenticated;
GRANT ALL ON public.report_history TO service_role;

ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_history_admin_read ON public.report_history;
CREATE POLICY report_history_admin_read ON public.report_history FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS report_history_admin_insert ON public.report_history;
CREATE POLICY report_history_admin_insert ON public.report_history FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
