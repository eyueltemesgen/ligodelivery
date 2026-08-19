DROP POLICY IF EXISTS media_public_read ON storage.objects;
CREATE POLICY media_public_read ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'ligo-media'
  AND (storage.foldername(name))[1] = ANY (ARRAY['categories','shops','products','offers','banners'])
);

CREATE TABLE IF NOT EXISTS public.admin_bootstrap (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_bootstrap TO service_role;
ALTER TABLE public.admin_bootstrap ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_bootstrap_admin_read ON public.admin_bootstrap;
CREATE POLICY admin_bootstrap_admin_read ON public.admin_bootstrap FOR SELECT TO authenticated USING (is_admin());

INSERT INTO public.admin_bootstrap (id)
SELECT true WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE bootstrap_done boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS(SELECT 1 FROM public.admin_bootstrap) INTO bootstrap_done;
  IF NOT bootstrap_done THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_bootstrap (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
  END IF;

  IF COALESCE(NEW.raw_user_meta_data->>'role','customer') = 'rider' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'rider') ON CONFLICT DO NOTHING;
    INSERT INTO public.riders (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'customer') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $function$;