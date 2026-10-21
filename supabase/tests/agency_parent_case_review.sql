-- Disposable migration replay only. All synthetic records roll back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('85000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agency-parent-owner@example.test'),
  ('85000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agency-parent-employee@example.test'),
  ('85000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agency-unrelated-owner@example.test'),
  ('85000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agency-branch-candidate@example.test');
INSERT INTO public.companies (id, name) VALUES
  ('81000000-0000-0000-0000-000000000001', 'Agency parent company'),
  ('81000000-0000-0000-0000-000000000003', 'Unrelated company');
INSERT INTO public.companies (id, name, parent_company_id) VALUES
  ('81000000-0000-0000-0000-000000000002', 'Agency branch',
   '81000000-0000-0000-0000-000000000001');
INSERT INTO public.company_members (company_id, user_id, member_role) VALUES
  ('81000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', 'owner'),
  ('81000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000002', 'hr'),
  ('81000000-0000-0000-0000-000000000003', '85000000-0000-0000-0000-000000000003', 'owner');
INSERT INTO public.agencies (id, name) VALUES
  ('82000000-0000-0000-0000-000000000001', 'Agency branch office');
INSERT INTO public.candidates (id, user_id, company_id, agency_id, name) VALUES
  ('83000000-0000-0000-0000-000000000001',
   '85000000-0000-0000-0000-000000000004',
   '81000000-0000-0000-0000-000000000002',
   '82000000-0000-0000-0000-000000000001', 'Branch candidate');
INSERT INTO public.agency_cases (candidate_id, company_id, agency_id, status, stage_index) VALUES
  ('83000000-0000-0000-0000-000000000001',
   '81000000-0000-0000-0000-000000000002',
   '82000000-0000-0000-0000-000000000001', 'awaiting_admin', 7);
INSERT INTO public.agency_case_documents
  (candidate_id, kind, storage_path, file_name, uploaded_by) VALUES
  ('83000000-0000-0000-0000-000000000001', 'visa',
   '82000000-0000-0000-0000-000000000001/83000000-0000-0000-0000-000000000001/visa.pdf',
   'visa.pdf', '85000000-0000-0000-0000-000000000004');
INSERT INTO public.agency_case_events (candidate_id, event_type, to_stage) VALUES
  ('83000000-0000-0000-0000-000000000001', 'stage', 7);
SET LOCAL session_replication_role = origin;

SELECT set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000003', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.can_view_agency_case(
    '81000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000001'
  ) OR (SELECT count(*) FROM public.agency_cases WHERE candidate_id = '83000000-0000-0000-0000-000000000001') <> 0
    OR (SELECT count(*) FROM public.agency_case_documents WHERE candidate_id = '83000000-0000-0000-0000-000000000001') <> 0
    OR (SELECT count(*) FROM public.agency_case_events WHERE candidate_id = '83000000-0000-0000-0000-000000000001') <> 0
  THEN RAISE EXCEPTION 'Unrelated owner can read branch agency case'; END IF;
  BEGIN
    PERFORM public.review_agency_case('83000000-0000-0000-0000-000000000001', 'accept', NULL);
    RAISE EXCEPTION 'Unrelated owner reviewed branch agency case';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Company owner access required' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000002', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.can_view_agency_case(
    '81000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000001'
  ) OR EXISTS (SELECT 1 FROM public.agency_cases WHERE candidate_id = '83000000-0000-0000-0000-000000000001')
  THEN RAISE EXCEPTION 'Parent company employee can read branch agency case'; END IF;
  BEGIN
    PERFORM public.review_agency_case('83000000-0000-0000-0000-000000000001', 'accept', NULL);
    RAISE EXCEPTION 'Parent company employee reviewed branch agency case';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Company owner access required' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '85000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT public.can_view_agency_case(
    '81000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000001'
  ) OR (SELECT count(*) FROM public.agency_cases WHERE candidate_id = '83000000-0000-0000-0000-000000000001') <> 1
    OR (SELECT count(*) FROM public.agency_case_documents WHERE candidate_id = '83000000-0000-0000-0000-000000000001') <> 1
    OR (SELECT count(*) FROM public.agency_case_events WHERE candidate_id = '83000000-0000-0000-0000-000000000001') <> 1
  THEN RAISE EXCEPTION 'Parent owner cannot read branch agency case and attachments'; END IF;
  PERFORM public.review_agency_case('83000000-0000-0000-0000-000000000001', 'accept', NULL);
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_cases
    WHERE candidate_id = '83000000-0000-0000-0000-000000000001'
      AND status = 'file_accepted'
      AND reviewed_by = '85000000-0000-0000-0000-000000000001'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.agency_case_events
    WHERE candidate_id = '83000000-0000-0000-0000-000000000001'
      AND event_type = 'accepted'
      AND actor_user_id = '85000000-0000-0000-0000-000000000001'
  ) THEN RAISE EXCEPTION 'Parent owner review did not record acceptance'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
