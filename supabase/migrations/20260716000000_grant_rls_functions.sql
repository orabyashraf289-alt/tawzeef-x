-- Grant execute permissions on functions used in RLS policies to public, anon, and authenticated roles
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO public, anon, authenticated;
