GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.shops TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.offers TO anon;
GRANT SELECT ON public.settings TO anon;