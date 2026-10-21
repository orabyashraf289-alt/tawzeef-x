-- Public application pages need employer identity, not access to company records.
-- Keep company RLS unchanged and expose only these two public branding fields.
CREATE OR REPLACE FUNCTION public.get_public_job_employer(_job_id uuid)
RETURNS TABLE (name text, logo_url text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(btrim(c.brand_settings->>'companyName'), ''), c.name),
         c.logo_url
  FROM public.jobs j
  JOIN public.companies c ON c.id = j.company_id
  LEFT JOIN public.companies parent ON parent.id = c.parent_company_id
  WHERE j.id = _job_id
    AND j.status = 'نشطة'
    AND c.status = 'active'
    AND (c.parent_company_id IS NULL OR parent.status = 'active');
$$;

REVOKE ALL ON FUNCTION public.get_public_job_employer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_job_employer(uuid) TO anon, authenticated;
