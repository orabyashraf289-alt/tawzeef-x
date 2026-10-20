-- Disposable database only. Synthetic fixtures, no webhooks, full rollback.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
 ('29000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','context@example.test');
INSERT INTO public.companies (id,name) VALUES
 ('19000000-0000-0000-0000-000000000001','Context A'),
 ('19000000-0000-0000-0000-000000000002','Context B');
INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
 ('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001','owner');
INSERT INTO public.jobs (id,user_id,company_id,title,department,location,type) VALUES
 ('49000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001','19000000-0000-0000-0000-000000000002','Context job','Test','Test','full-time');
SET LOCAL session_replication_role = origin;

-- Temp tables exercise the installed trigger without unrelated business hooks.
CREATE TEMP TABLE context_probe (id integer, company_id uuid);
CREATE TRIGGER context_probe_tenant BEFORE INSERT ON context_probe
FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
CREATE TEMP TABLE candidates (id integer, company_id uuid, job_id uuid);
CREATE TRIGGER context_candidate_tenant BEFORE INSERT ON pg_temp.candidates
FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
CREATE TEMP TABLE applications (id integer, company_id uuid, job_id uuid);
CREATE TRIGGER context_application_tenant BEFORE INSERT ON pg_temp.applications
FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();

SELECT set_config('request.jwt.claim.sub','29000000-0000-0000-0000-000000000001',true);
INSERT INTO context_probe VALUES (1,NULL);
INSERT INTO context_probe VALUES (2,'19000000-0000-0000-0000-000000000002');
-- Job context must win over the caller's unrelated single membership.
INSERT INTO pg_temp.candidates VALUES (1,NULL,'49000000-0000-0000-0000-000000000001');
INSERT INTO pg_temp.applications VALUES (1,NULL,'49000000-0000-0000-0000-000000000001');
INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
 ('19000000-0000-0000-0000-000000000002','29000000-0000-0000-0000-000000000001','owner');
INSERT INTO context_probe VALUES (3,'19000000-0000-0000-0000-000000000002');
INSERT INTO pg_temp.candidates VALUES (2,NULL,'49000000-0000-0000-0000-000000000001');
DO $$ BEGIN
  BEGIN
    INSERT INTO context_probe VALUES (4,NULL);
    RAISE EXCEPTION 'Ambiguous membership was accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'company_context_required' THEN RAISE; END IF;
  END;
  IF (SELECT company_id FROM context_probe WHERE id=1) <> '19000000-0000-0000-0000-000000000001'::uuid
    OR EXISTS (SELECT 1 FROM context_probe WHERE id IN (2,3) AND company_id IS DISTINCT FROM '19000000-0000-0000-0000-000000000002'::uuid)
    OR EXISTS (SELECT 1 FROM pg_temp.candidates WHERE company_id IS DISTINCT FROM '19000000-0000-0000-0000-000000000002'::uuid)
    OR EXISTS (SELECT 1 FROM pg_temp.applications WHERE company_id IS DISTINCT FROM '19000000-0000-0000-0000-000000000002'::uuid)
  THEN RAISE EXCEPTION 'Incorrect tenant assignment'; END IF;
  IF has_function_privilege('anon','public.set_row_company_id()','EXECUTE')
    OR has_function_privilege('authenticated','public.set_row_company_id()','EXECUTE')
  THEN RAISE EXCEPTION 'Trigger function exposed to clients'; END IF;
END $$;

-- Anonymous application and no-context server inserts retain their behavior.
SELECT set_config('request.jwt.claim.sub','',true);
INSERT INTO pg_temp.applications VALUES (2,NULL,'49000000-0000-0000-0000-000000000001');
INSERT INTO context_probe VALUES (5,NULL);
DO $$ BEGIN
  IF (SELECT company_id FROM pg_temp.applications WHERE id=2) IS DISTINCT FROM '19000000-0000-0000-0000-000000000002'::uuid
    OR (SELECT company_id FROM context_probe WHERE id=5) IS NOT NULL
  THEN RAISE EXCEPTION 'No-session behavior changed'; END IF;
END $$;

-- Explicit tenant preservation must not bypass a table's RLS check.
ALTER TABLE context_probe ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON context_probe TO authenticated;
CREATE POLICY context_probe_scope ON context_probe TO authenticated
USING (company_id='19000000-0000-0000-0000-000000000001'::uuid)
WITH CHECK (company_id='19000000-0000-0000-0000-000000000001'::uuid);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO context_probe VALUES (6,'19000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Foreign company bypassed RLS';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- A branch owner can update ordinary details but cannot rewrite the parent
-- relationship used by inherited RLS access.
SET LOCAL session_replication_role = replica;
INSERT INTO public.companies (id,name,parent_company_id) VALUES
 ('19000000-0000-0000-0000-000000000003','Context branch','19000000-0000-0000-0000-000000000001');
INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
 ('19000000-0000-0000-0000-000000000003','29000000-0000-0000-0000-000000000001','owner');
SET LOCAL session_replication_role = origin;
-- The local replay starts with narrower table grants than production. This
-- transactional grant exercises the actual owner RLS and trigger, then rolls back.
GRANT SELECT, UPDATE ON public.companies TO authenticated;
SELECT set_config('request.jwt.claim.sub','29000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
UPDATE public.companies SET name='Context branch edited'
 WHERE id='19000000-0000-0000-0000-000000000003';
DO $$ BEGIN
  BEGIN
    UPDATE public.companies SET parent_company_id='19000000-0000-0000-0000-000000000002'
     WHERE id='19000000-0000-0000-0000-000000000003';
    RAISE EXCEPTION 'Branch moved to another company';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'company_parent_immutable' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.companies SET parent_company_id=NULL
     WHERE id='19000000-0000-0000-0000-000000000003';
    RAISE EXCEPTION 'Branch promoted to root company';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'company_parent_immutable' THEN RAISE; END IF;
  END;
  IF (SELECT name FROM public.companies WHERE id='19000000-0000-0000-0000-000000000003') <> 'Context branch edited'
    OR (SELECT parent_company_id FROM public.companies WHERE id='19000000-0000-0000-0000-000000000003')
       <> '19000000-0000-0000-0000-000000000001'::uuid
  THEN RAISE EXCEPTION 'Branch details or parent guard failed'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
