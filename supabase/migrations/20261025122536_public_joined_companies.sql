-- Deliberate public branding projection. Company rows and membership remain private.
CREATE OR REPLACE FUNCTION public.get_public_joined_companies()
RETURNS TABLE (name text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT COALESCE(NULLIF(btrim(c.brand_settings->>'companyName'), ''), c.name), c.logo_url
  FROM public.companies AS c
  WHERE c.status = 'active'
    AND c.is_platform_company IS NOT TRUE
    AND c.parent_company_id IS NULL
  ORDER BY c.created_at DESC, c.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_joined_companies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_joined_companies() TO anon, authenticated;
COMMENT ON FUNCTION public.get_public_joined_companies() IS
  'Public name and logo of active main customer companies; excludes platform, branches and unapproved registration requests. No contact or hiring data.';
