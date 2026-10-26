-- Disposable database only; all fixtures are rolled back.
BEGIN;
-- Seed only the read-model fixtures without subscription, provisioning or
-- outgoing job/application hooks. Restore all triggers before access assertions.
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at,raw_user_meta_data) VALUES
 ('43000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','applicant@example.test',now(),'{"account_type":"job_seeker"}'),
 ('43000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','unverified@example.test',null,'{"account_type":"job_seeker"}');
INSERT INTO public.user_roles(user_id,role) VALUES
 ('43000000-0000-0000-0000-000000000001','job_seeker'),
 ('43000000-0000-0000-0000-000000000002','job_seeker');
INSERT INTO public.companies(id,name,status) VALUES
 ('44000000-0000-0000-0000-000000000001','Applied company','active'),
 ('44000000-0000-0000-0000-000000000002','Unrelated company','active');
INSERT INTO public.jobs(id,title,user_id,company_id,status,department,location,type) VALUES
 ('45000000-0000-0000-0000-000000000001','Applied job','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','نشطة','Test','Test','full-time'),
 ('45000000-0000-0000-0000-000000000002','Other job','43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000002','نشطة','Test','Test','full-time');
INSERT INTO public.applications(id,job_id,company_id,name,email,phone) VALUES
 ('46000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','Applicant','Applicant@EXAMPLE.test','000'),
 ('46000000-0000-0000-0000-000000000002','45000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','Other applicant','someone-else@example.test','000');
-- Include an unrelated manual candidate with the same email to test job scope.
INSERT INTO public.candidates(id,name,email,job_id,company_id,user_id) VALUES
 ('47000000-0000-0000-0000-000000000001','Unrelated manual candidate','applicant@example.test','45000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000002','43000000-0000-0000-0000-000000000001');
INSERT INTO public.candidates(id,name,email,job_id,company_id,user_id) VALUES
 ('47000000-0000-0000-0000-000000000002','Own candidate','applicant@example.test','45000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001');
INSERT INTO public.interviews(id,candidate_id,company_id,position,candidate_name,date,time,type,status,notes,user_id) VALUES
 ('48000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000001','Own interview','Applicant','2026-11-01','10:00','video','مجدولة','Private reviewer notes','43000000-0000-0000-0000-000000000001');
INSERT INTO public.job_offers(id,candidate_id,company_id,job_id,position,salary,status,user_id) VALUES
 ('49000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','Published offer',100,'sent','43000000-0000-0000-0000-000000000001'),
 ('49000000-0000-0000-0000-000000000002','47000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','Private draft',200,'draft','43000000-0000-0000-0000-000000000001');
SET LOCAL session_replication_role = origin;
SELECT set_config('request.jwt.claim.sub','43000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE _data jsonb; BEGIN
  _data := public.get_my_applicant_portal();
  IF jsonb_array_length(_data->'offers') <> 1 OR _data->'offers'->0->>'position' <> 'Published offer' THEN RAISE EXCEPTION 'Draft offer leaked or published offer lost'; END IF;
  IF jsonb_array_length(_data->'interviews') <> 1 OR (_data->'interviews'->0) ? 'notes' THEN RAISE EXCEPTION 'Interview missing or private notes leaked'; END IF;
  IF jsonb_array_length(_data->'applications') <> 1 THEN RAISE EXCEPTION 'Applicant read other applications or lost own application'; END IF;
  IF _data->'applications'->0->>'company_name' <> 'Applied company' THEN RAISE EXCEPTION 'Wrong company scope'; END IF;
  IF jsonb_array_length(_data->'candidates') <> 1 THEN RAISE EXCEPTION 'Own candidate missing or unrelated candidate leaked'; END IF;
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
-- Adding a staff identity must revoke applicant-only access immediately,
-- even when job_seeker is still present and the email matches an application.
SELECT set_config('request.jwt.claim.sub','43000000-0000-0000-0000-000000000001',true);
DO $$ DECLARE _case text; BEGIN
  FOREACH _case IN ARRAY ARRAY['staff_role','platform','company','agency','signup_intent','registration'] LOOP
    CASE _case
      WHEN 'staff_role' THEN
        INSERT INTO public.user_roles(user_id,role) VALUES ('43000000-0000-0000-0000-000000000001','admin');
      WHEN 'platform' THEN
        INSERT INTO public.platform_roles(user_id,role) VALUES ('43000000-0000-0000-0000-000000000001','super_admin');
      WHEN 'company' THEN
        INSERT INTO public.company_members(user_id,company_id,member_role) VALUES ('43000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','owner');
      WHEN 'agency' THEN
        INSERT INTO public.agencies(id,name) VALUES ('4a000000-0000-0000-0000-000000000001','Test agency');
        INSERT INTO public.agency_members(user_id,agency_id) VALUES ('43000000-0000-0000-0000-000000000001','4a000000-0000-0000-0000-000000000001');
      WHEN 'signup_intent' THEN
        INSERT INTO tenant_internal.company_signup_intents(user_id) VALUES ('43000000-0000-0000-0000-000000000001');
      WHEN 'registration' THEN
        INSERT INTO public.company_registration_requests(user_id,company_name,contact_email) VALUES ('43000000-0000-0000-0000-000000000001','Pending company','applicant@example.test');
    END CASE;
    IF tenant_internal.is_applicant_account() THEN RAISE EXCEPTION 'Staff identity % was classified as applicant', _case; END IF;
    IF public.my_verified_applicant_email() IS NOT NULL THEN RAISE EXCEPTION 'Staff identity % retained applicant RLS email', _case; END IF;
    IF coalesce((public.validate_tenant_status()->>'is_candidate')::boolean,false) THEN RAISE EXCEPTION 'Staff identity % routed as applicant', _case; END IF;
    BEGIN
      PERFORM public.get_my_applicant_portal();
      RAISE EXCEPTION 'Staff identity % accessed applicant data', _case;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    DELETE FROM public.user_roles WHERE user_id='43000000-0000-0000-0000-000000000001' AND role='admin';
    DELETE FROM public.platform_roles WHERE user_id='43000000-0000-0000-0000-000000000001';
    DELETE FROM public.company_members WHERE user_id='43000000-0000-0000-0000-000000000001';
    DELETE FROM public.agency_members WHERE user_id='43000000-0000-0000-0000-000000000001';
    DELETE FROM tenant_internal.company_signup_intents WHERE user_id='43000000-0000-0000-0000-000000000001';
    DELETE FROM public.company_registration_requests WHERE user_id='43000000-0000-0000-0000-000000000001';
  END LOOP;
  IF NOT tenant_internal.is_applicant_account() THEN RAISE EXCEPTION 'Applicant access did not recover'; END IF;
  IF has_function_privilege('authenticated','tenant_internal.is_applicant_account()','EXECUTE') THEN RAISE EXCEPTION 'Internal helper exposed'; END IF;
END $$;
ROLLBACK;
