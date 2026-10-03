-- Disposable replay database only. All synthetic rows are rolled back.
BEGIN;

SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'invitee@example.test'),
  ('21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.test');
SET LOCAL session_replication_role = origin;

INSERT INTO public.companies (id, name, parent_company_id) VALUES
  ('11000000-0000-0000-0000-000000000001', 'Invitation fixture A', NULL),
  ('11000000-0000-0000-0000-000000000002', 'Invitation fixture A branch', '11000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000003', 'Invitation fixture B', NULL),
  ('11000000-0000-0000-0000-000000000004', 'Invitation fixture B branch', '11000000-0000-0000-0000-000000000003'),
  ('11000000-0000-0000-0000-000000000005', 'Invitation fixture A viewer branch', '11000000-0000-0000-0000-000000000001');

INSERT INTO public.company_invitations (company_id, branch_id, email, member_role, token) VALUES
  ('11000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'invitee@example.test', 'hr', 'FIXTURE-VALID'),
  ('11000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'invitee@example.test', 'hr', 'FIXTURE-FOREIGN-BRANCH'),
  ('11000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000005', 'invitee@example.test', 'viewer', 'FIXTURE-VIEWER'),
  ('11000000-0000-0000-0000-000000000003', NULL, 'outsider@example.test', 'owner', 'FIXTURE-OTHER-TENANT');

INSERT INTO public.user_roles (user_id, role)
VALUES ('21000000-0000-0000-0000-000000000001', 'admin');

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.accept_company_invitation(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous users may execute invitation acceptance';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"21000000-0000-0000-0000-000000000001","email":"wrong@example.test"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (public.accept_company_invitation('FIXTURE-VALID')->>'code') IS DISTINCT FROM 'EMAIL_MISMATCH' THEN
    RAISE EXCEPTION 'Invitation was accepted by a different email';
  END IF;
  IF (SELECT count(*) FROM public.company_invitations WHERE token = 'FIXTURE-OTHER-TENANT') <> 0 THEN
    RAISE EXCEPTION 'Tenant application admin can read another company invitation';
  END IF;
END $$;

SELECT set_config('request.jwt.claims', '{"sub":"21000000-0000-0000-0000-000000000001","email":"invitee@example.test"}', true);
DO $$
BEGIN
  IF (public.accept_company_invitation('FIXTURE-FOREIGN-BRANCH')->>'code') IS DISTINCT FROM 'INVALID_BRANCH' THEN
    RAISE EXCEPTION 'Foreign company branch was accepted';
  END IF;
  IF (public.accept_company_invitation('FIXTURE-VALID')->>'success') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Valid matching invitation was rejected';
  END IF;
  IF (public.accept_company_invitation('FIXTURE-VALID')->>'code') IS DISTINCT FROM 'INVITATION_NOT_PENDING' THEN
    RAISE EXCEPTION 'An invitation could be accepted twice';
  END IF;
  IF (public.accept_company_invitation('FIXTURE-VIEWER')->>'success') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Viewer invitation was rejected';
  END IF;
END $$;

RESET ROLE;
DO $$
BEGIN
  IF (SELECT manager_user_id FROM public.companies WHERE id='11000000-0000-0000-0000-000000000002')
       IS DISTINCT FROM '21000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'Valid branch manager was not assigned';
  END IF;
  IF (SELECT manager_user_id FROM public.companies WHERE id='11000000-0000-0000-0000-000000000004') IS NOT NULL
     OR (SELECT manager_user_id FROM public.companies WHERE id='11000000-0000-0000-0000-000000000005') IS NOT NULL THEN
    RAISE EXCEPTION 'Cross-tenant or viewer manager was assigned';
  END IF;
  IF (SELECT member_role FROM public.company_members
      WHERE company_id='11000000-0000-0000-0000-000000000005'
        AND user_id='21000000-0000-0000-0000-000000000001') IS DISTINCT FROM 'viewer' THEN
    RAISE EXCEPTION 'Viewer branch membership gained an HR role';
  END IF;
  IF EXISTS (SELECT 1 FROM public.company_members
      WHERE company_id='11000000-0000-0000-0000-000000000004'
        AND user_id='21000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'Foreign branch membership was created';
  END IF;
END $$;

ROLLBACK;
