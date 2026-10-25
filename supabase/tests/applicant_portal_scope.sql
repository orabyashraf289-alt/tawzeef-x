-- Disposable database only; all fixtures are rolled back.
BEGIN;
INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at,raw_user_meta_data) VALUES
 ('43000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','applicant@example.test',now(),'{"account_type":"job_seeker"}'),
 ('43000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','unverified@example.test',null,'{"account_type":"job_seeker"}');
INSERT INTO public.companies(id,name,status) VALUES
 ('44000000-0000-0000-0000-000000000001','Applied company','active'),
 ('44000000-0000-0000-0000-000000000002','Unrelated company','active');
INSERT INTO public.jobs(id,title,user_id,company_id,status,department,location,type) VALUES
 ('45000000-0000-0000-0000-000000000001','Applied job','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','نشطة','Test','Test','full-time'),
 ('45000000-0000-0000-0000-000000000002','Other job','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000002','نشطة','Test','Test','full-time');
INSERT INTO public.applications(id,job_id,company_id,name,email,phone) VALUES
 ('46000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','Applicant','Applicant@EXAMPLE.test','000'),
 ('46000000-0000-0000-0000-000000000002','45000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','Other applicant','someone-else@example.test','000');
-- Production inserts a candidate on application submission; use that actual row.
INSERT INTO public.candidates(id,name,email,job_id,company_id,user_id) VALUES
 ('47000000-0000-0000-0000-000000000001','Unrelated manual candidate','applicant@example.test','45000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000002','43000000-0000-0000-0000-000000000001');
INSERT INTO public.candidates(id,name,email,job_id,company_id,user_id) VALUES
 ('47000000-0000-0000-0000-000000000002','Own candidate','applicant@example.test','45000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001');
INSERT INTO public.interviews(id,candidate_id,company_id,position,candidate_name,date,time,type,status,notes,user_id) VALUES
 ('48000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000001','Own interview','Applicant','2026-11-01','10:00','video','مجدولة','Private reviewer notes','43000000-0000-0000-0000-000000000001');
INSERT INTO public.job_offers(id,candidate_id,company_id,job_id,position,salary,status,user_id) VALUES
 ('49000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','Published offer',100,'sent','43000000-0000-0000-0000-000000000001'),
 ('49000000-0000-0000-0000-000000000002','47000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','Private draft',200,'draft','43000000-0000-0000-0000-000000000001');
SELECT set_config('request.jwt.claim.sub','43000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE _data jsonb; BEGIN
  _data := public.get_my_applicant_portal();
  IF jsonb_array_length(_data->'offers') <> 1 OR _data->'offers'->0->>'position' <> 'Published offer' THEN RAISE EXCEPTION 'Draft offer leaked or published offer lost'; END IF;
  IF jsonb_array_length(_data->'interviews') <> 1 OR (_data->'interviews'->0) ? 'notes' THEN RAISE EXCEPTION 'Interview missing or private notes leaked'; END IF;
  IF jsonb_array_length(_data->'applications') <> 1 THEN RAISE EXCEPTION 'Applicant read other applications or lost own application'; END IF;
  IF _data->'applications'->0->>'company_name' <> 'Applied company' THEN RAISE EXCEPTION 'Wrong company scope'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_data->'candidates') c WHERE c->>'company_id' <> '44000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Candidate without application leaked'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_data->'candidates') c WHERE c ? 'ai_evaluation' OR c ? 'ai_score' OR c ? 'notes') THEN RAISE EXCEPTION 'Internal HR fields leaked'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','43000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.get_my_applicant_portal();
    RAISE EXCEPTION 'Unverified account read applications';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF has_function_privilege('anon','public.get_my_applicant_portal()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous portal access'; END IF;
END $$;
ROLLBACK;
