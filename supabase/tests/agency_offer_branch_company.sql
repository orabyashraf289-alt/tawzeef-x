-- Disposable migration replay only. All fixture rows are rolled back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES
  ('96000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','offer-parent@example.test'),
  ('96000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','offer-other@example.test'),
  ('96000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','offer-candidate@example.test');
INSERT INTO public.companies (id,name) VALUES
  ('91000000-0000-0000-0000-000000000001','Offer parent'),
  ('91000000-0000-0000-0000-000000000003','Other offer tenant');
INSERT INTO public.companies (id,name,parent_company_id) VALUES
  ('91000000-0000-0000-0000-000000000002','Offer branch',
   '91000000-0000-0000-0000-000000000001');
INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
  ('91000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001','owner'),
  ('91000000-0000-0000-0000-000000000003','96000000-0000-0000-0000-000000000002','owner');
INSERT INTO public.jobs (id,user_id,company_id,title,department,location,type) VALUES
  ('92000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001',
   '91000000-0000-0000-0000-000000000002','Branch job','HR','Riyadh','full-time'),
  ('92000000-0000-0000-0000-000000000002','96000000-0000-0000-0000-000000000002',
   '91000000-0000-0000-0000-000000000003','Other job','HR','Riyadh','full-time');
INSERT INTO public.candidates (id,user_id,company_id,job_id,name) VALUES
  ('93000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000003',
   '91000000-0000-0000-0000-000000000002',
   '92000000-0000-0000-0000-000000000001','Branch offer candidate');
SET LOCAL session_replication_role = origin;

SELECT set_config('request.jwt.claim.sub','96000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.job_offers (id,user_id,company_id,candidate_id,job_id,position,salary)
VALUES (
  '94000000-0000-0000-0000-000000000001',
  '96000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000002',
  '93000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001','Branch job',1000
);
DO $$
DECLARE violated_constraint text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.job_offers
    WHERE id='94000000-0000-0000-0000-000000000001'
      AND company_id='91000000-0000-0000-0000-000000000002'
      AND candidate_id='93000000-0000-0000-0000-000000000001'
      AND status='draft'
  ) THEN RAISE EXCEPTION 'Parent owner offer lost the branch company'; END IF;
  BEGIN
    INSERT INTO public.job_offers (user_id,company_id,candidate_id,job_id,position,salary)
    VALUES (
      '96000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000002',
      '93000000-0000-0000-0000-000000000001',
      '92000000-0000-0000-0000-000000000002','Other job',1000
    );
    RAISE EXCEPTION 'Cross-company job linked to branch candidate';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS violated_constraint = CONSTRAINT_NAME;
    IF violated_constraint <> 'job_offers_company_job_fkey' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','96000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.job_offers WHERE id='94000000-0000-0000-0000-000000000001')
  THEN RAISE EXCEPTION 'Unrelated company can read branch offer'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
