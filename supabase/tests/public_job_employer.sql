-- Disposable replay database only; all synthetic records roll back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO public.companies (id,name,brand_settings,logo_url,status) VALUES
 ('a1000000-0000-0000-0000-000000000001','Legal employer','{"companyName":" Public school ","privateNote":"never expose"}','https://example.test/logo.png','active'),
 ('a1000000-0000-0000-0000-000000000002','Suspended employer',NULL,NULL,'suspended');
INSERT INTO public.companies (id,name,parent_company_id,brand_settings) VALUES
 ('a1000000-0000-0000-0000-000000000003','Branch school','a1000000-0000-0000-0000-000000000001','{"companyName":" "}'),
 ('a1000000-0000-0000-0000-000000000004','Blocked branch','a1000000-0000-0000-0000-000000000002',NULL);
INSERT INTO public.jobs (id,user_id,company_id,title,department,location,type,status) VALUES
 ('a2000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Public job','Test','Test','full-time','نشطة'),
 ('a2000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Closed job','Test','Test','full-time','مغلقة'),
 ('a2000000-0000-0000-0000-000000000003','a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003','Branch job','Test','Test','full-time','نشطة'),
 ('a2000000-0000-0000-0000-000000000004','a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','Suspended employer job','Test','Test','full-time','نشطة'),
 ('a2000000-0000-0000-0000-000000000005','a3000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000004','Suspended parent job','Test','Test','full-time','نشطة');
SET LOCAL session_replication_role = origin;
GRANT SELECT ON public.companies TO anon;
SET LOCAL ROLE anon;
DO $$
DECLARE identity jsonb;
BEGIN
  SELECT to_jsonb(e) INTO identity FROM public.get_public_job_employer('a2000000-0000-0000-0000-000000000001') e;
  IF identity IS DISTINCT FROM '{"name":"Public school","logo_url":"https://example.test/logo.png"}'::jsonb
  THEN RAISE EXCEPTION 'Public identity must contain only the employer name and logo'; END IF;
  IF (SELECT name FROM public.get_public_job_employer('a2000000-0000-0000-0000-000000000003')) IS DISTINCT FROM 'Branch school'
  THEN RAISE EXCEPTION 'Branch identity must not be replaced by its parent'; END IF;
  IF EXISTS (SELECT 1 FROM public.get_public_job_employer('a2000000-0000-0000-0000-000000000002'))
     OR EXISTS (SELECT 1 FROM public.get_public_job_employer('a2000000-0000-0000-0000-000000000004'))
     OR EXISTS (SELECT 1 FROM public.get_public_job_employer('a2000000-0000-0000-0000-000000000005'))
     OR EXISTS (SELECT 1 FROM public.get_public_job_employer('a2000000-0000-0000-0000-000000000099'))
     OR EXISTS (SELECT 1 FROM public.get_public_job_employer(NULL))
  THEN RAISE EXCEPTION 'Closed, missing, or suspended employers must not expose identity'; END IF;
  IF EXISTS (SELECT 1 FROM public.companies WHERE id='a1000000-0000-0000-0000-000000000001')
  THEN RAISE EXCEPTION 'Public identity must not grant direct company row access'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT name FROM public.get_public_job_employer('a2000000-0000-0000-0000-000000000001')) IS DISTINCT FROM 'Public school'
  THEN RAISE EXCEPTION 'Signed-in applicants must also resolve public employer identity'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
