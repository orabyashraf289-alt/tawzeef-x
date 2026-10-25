-- Disposable replay database only. Fixtures and grants roll back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO public.companies (id, name, brand_settings, logo_url, status, is_platform_company, parent_company_id) VALUES
 ('a5100000-0000-0000-0000-000000000001','Showcase legal name','{"companyName":" Showcase approved ","privateNote":"hidden"}','https://example.test/brand.png','active',false,NULL),
 ('a5100000-0000-0000-0000-000000000002','Showcase suspended',NULL,NULL,'suspended',false,NULL),
 ('a5100000-0000-0000-0000-000000000003','Showcase platform',NULL,NULL,'active',true,NULL),
 ('a5100000-0000-0000-0000-000000000004','Showcase branch',NULL,NULL,'active',false,'a5100000-0000-0000-0000-000000000001'),
 ('a5100000-0000-0000-0000-000000000005','Showcase fallback','{"companyName":" "}',NULL,'active',false,NULL);
SET LOCAL session_replication_role = origin;
GRANT SELECT ON public.companies TO anon;
SET LOCAL ROLE anon;
DO $$
DECLARE identity jsonb;
BEGIN
  SELECT to_jsonb(c) INTO identity FROM public.get_public_joined_companies() c WHERE name='Showcase approved';
  IF identity IS DISTINCT FROM '{"name":"Showcase approved","logo_url":"https://example.test/brand.png"}'::jsonb
  THEN RAISE EXCEPTION 'Only public branding may be returned'; END IF;
  IF (SELECT count(*) FROM public.get_public_joined_companies() WHERE name LIKE 'Showcase%') <> 2
  THEN RAISE EXCEPTION 'Platform, branch and suspended companies must not be listed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_public_joined_companies() WHERE name='Showcase fallback' AND logo_url IS NULL)
  THEN RAISE EXCEPTION 'Missing branding must fall back to the company name'; END IF;
  IF EXISTS (SELECT 1 FROM public.companies WHERE id='a5100000-0000-0000-0000-000000000001')
  THEN RAISE EXCEPTION 'Showcase must not expose raw company rows'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.get_public_joined_companies() WHERE name LIKE 'Showcase%') <> 2
  THEN RAISE EXCEPTION 'Authenticated public visitors must see the same branding'; END IF;
END $$;
RESET ROLE;
UPDATE public.companies SET status='suspended' WHERE id='a5100000-0000-0000-0000-000000000001';
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.get_public_joined_companies() WHERE name='Showcase approved')
  THEN RAISE EXCEPTION 'Suspending a company must remove its public listing'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
