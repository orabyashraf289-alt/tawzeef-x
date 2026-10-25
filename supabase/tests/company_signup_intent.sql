-- Disposable database only. Exercises real trigger, RLS and review RPC.
BEGIN;
INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
VALUES
 ('42000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','approval@example.test',now(),'{"account_type":"company"}'),
 ('42000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rejected@example.test',now(),'{"account_type":"company"}'),
 ('42000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reviewer@example.test',now(),'{}');
INSERT INTO public.platform_roles(user_id,role) VALUES ('42000000-0000-0000-0000-000000000003','super_admin');
SELECT set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT public.can_complete_company_onboarding() THEN RAISE EXCEPTION 'Missing registration intent'; END IF;
END $$;
UPDATE public.profiles SET company_name='Approval fixture' WHERE user_id=auth.uid();
DO $$ DECLARE _id uuid; BEGIN
  SELECT id INTO _id FROM public.company_registration_requests WHERE user_id=auth.uid();
  IF _id IS NULL OR public.can_complete_company_onboarding() THEN RAISE EXCEPTION 'Request must consume intent'; END IF;
  IF EXISTS (SELECT 1 FROM public.company_members WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Pending request gained membership'; END IF;
  BEGIN
    PERFORM public.review_company_registration(_id,'approved','');
    RAISE EXCEPTION 'Applicant approved own company';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.company_registration_requests SET status='approved' WHERE id=_id;
    RAISE EXCEPTION 'Applicant changed request directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.profiles SET company_name='Cannot replace submitted request' WHERE user_id=auth.uid();
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
UPDATE public.profiles SET company_name='Rejected fixture' WHERE user_id=auth.uid();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.company_registration_requests) <> 1 THEN RAISE EXCEPTION 'Request leaks across accounts'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE _id uuid; _company uuid; BEGIN
  SELECT id INTO _id FROM public.company_registration_requests WHERE company_name='Approval fixture';
  _company := public.review_company_registration(_id,'approved','Verified');
  IF _company IS NULL OR NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id=_company AND user_id='42000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'Approval did not create owner membership'; END IF;
  BEGIN
    PERFORM public.review_company_registration(_id,'approved','');
    RAISE EXCEPTION 'Repeated review succeeded';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Request is no longer pending' THEN RAISE; END IF; END;
  SELECT id INTO _id FROM public.company_registration_requests WHERE company_name='Rejected fixture';
  BEGIN
    PERFORM public.review_company_registration(_id,'rejected',' ');
    RAISE EXCEPTION 'Rejection without reason succeeded';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'Invalid review decision or reason' THEN RAISE; END IF; END;
  PERFORM public.review_company_registration(_id,'rejected','Company details could not be verified');
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.company_members WHERE user_id='42000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Rejected request gained membership'; END IF;
  IF EXISTS (SELECT 1 FROM public.company_registration_requests WHERE reviewed_by IS DISTINCT FROM '42000000-0000-0000-0000-000000000003'::uuid AND user_id IN ('42000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'Missing reviewer audit'; END IF;
END $$;
DELETE FROM public.company_members WHERE user_id='42000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','42000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
UPDATE public.profiles SET company_name='Forbidden replacement' WHERE user_id=auth.uid();
DO $$ BEGIN
  IF public.can_complete_company_onboarding() THEN RAISE EXCEPTION 'Removed user regained onboarding'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.companies WHERE owner_user_id='42000000-0000-0000-0000-000000000001') <> 1 THEN RAISE EXCEPTION 'Duplicate company'; END IF;
  IF has_table_privilege('authenticated','public.company_registration_requests','UPDATE')
    OR has_table_privilege('authenticated','public.company_registration_requests','INSERT')
    OR has_function_privilege('anon','public.review_company_registration(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Registration privileges are too broad'; END IF;
END $$;
ROLLBACK;
