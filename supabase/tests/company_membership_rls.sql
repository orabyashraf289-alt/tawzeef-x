-- Run on a disposable database after remove_direct_parent_signup_policies.
-- No fixture survives this transaction.
BEGIN;

SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('41000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'membership-a@example.test'),
  ('41000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'membership-b@example.test');
SET LOCAL session_replication_role = origin;
INSERT INTO public.companies (id, name, owner_user_id) VALUES
  ('31000000-0000-0000-0000-000000000001', 'Membership tenant A', '41000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', 'Membership tenant B', '41000000-0000-0000-0000-000000000002');
INSERT INTO public.companies (id, name, owner_user_id, parent_company_id) VALUES
  ('31000000-0000-0000-0000-000000000003', 'Tenant B branch', '41000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002');
INSERT INTO public.company_members (company_id, user_id, member_role)
VALUES ('31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'owner');

SELECT set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;

DO $$ BEGIN
  BEGIN
    INSERT INTO public.company_members (company_id, user_id, member_role)
    VALUES ('31000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', 'owner');
    RAISE EXCEPTION 'A user joined another parent company';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.company_members (company_id, user_id, member_role)
    VALUES ('31000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000001', 'owner');
    RAISE EXCEPTION 'A user joined another company branch';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.companies (name, owner_user_id, parent_company_id)
    VALUES ('Forged branch', '41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'A user created a branch under another tenant';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.companies (name, owner_user_id)
    VALUES ('Forged parent', '41000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Existing owner created another parent through REST';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
DELETE FROM public.company_members
WHERE user_id = '41000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.company_members (company_id, user_id, member_role)
    VALUES ('31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'owner');
    RAISE EXCEPTION 'Removed owner regained company membership';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
ROLLBACK;
