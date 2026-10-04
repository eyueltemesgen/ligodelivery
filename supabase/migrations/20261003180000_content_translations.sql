-- Multilingual dynamic content.
--
-- Additive and idempotent: no existing table, row, id or policy is dropped or
-- rewritten. English stays the source of truth in the base tables (shops,
-- products, services, categories, offers); this table stores optional
-- translations keyed by (entity_type, entity_id, field, language) so records
-- are never duplicated and the app falls back to English when a translation is
-- missing.

CREATE TABLE IF NOT EXISTS public.content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (
    entity_type IN ('shop', 'product', 'service', 'service_category', 'category', 'offer')
  ),
  entity_id uuid NOT NULL,
  field text NOT NULL DEFAULT 'name',
  language text NOT NULL CHECK (language IN ('am', 'om')),
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, field, language)
);

CREATE INDEX IF NOT EXISTS content_translations_lookup_idx
  ON public.content_translations(entity_type, entity_id, language);

GRANT SELECT ON public.content_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_translations TO authenticated;
GRANT ALL ON public.content_translations TO service_role;

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

-- Translations are public read data (the storefront needs them) and writable
-- only by admins. Shop owners may translate their own catalogue entries.
DROP POLICY IF EXISTS content_translations_public_read ON public.content_translations;
CREATE POLICY content_translations_public_read ON public.content_translations
  FOR SELECT USING (true);

-- Ownership helper: returns true when the caller owns the underlying record.
-- Declared before the RLS policy that references it.
CREATE OR REPLACE FUNCTION public.owns_entity(_entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _entity_type
    WHEN 'shop' THEN public.owns_shop(_entity_id)
    WHEN 'product' THEN EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = _entity_id AND public.owns_shop(p.shop_id)
    )
    WHEN 'service' THEN EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = _entity_id AND s.shop_id IS NOT NULL AND public.owns_shop(s.shop_id)
    )
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.owns_entity(text, uuid) TO authenticated;

DROP POLICY IF EXISTS content_translations_admin_write ON public.content_translations;
CREATE POLICY content_translations_admin_write ON public.content_translations
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.owns_entity(entity_type, entity_id))
  WITH CHECK (public.is_admin() OR public.owns_entity(entity_type, entity_id));

DROP TRIGGER IF EXISTS content_translations_updated ON public.content_translations;
CREATE TRIGGER content_translations_updated BEFORE UPDATE ON public.content_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

