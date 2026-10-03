-- Disposable replay database only. Fixtures are rolled back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('23000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'automation-owner-a@example.test'),
  ('23000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'automation-owner-b@example.test'),
  ('23000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'automation-member@example.test');
SET LOCAL session_replication_role = origin;

INSERT INTO public.companies (id, name) VALUES
  ('13000000-0000-0000-0000-000000000001', 'Automation fixture A'),
  ('13000000-0000-0000-0000-000000000002', 'Automation fixture B');
INSERT INTO public.company_members (company_id, user_id, member_role) VALUES
  ('13000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'owner'),
  ('13000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'owner'),
  ('13000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000003', 'hr');
INSERT INTO public.automation_rules (id, company_id, title, trigger_event, created_by) VALUES
  ('33000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'Automation fixture A rule', 'application.created', '23000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'Automation fixture B rule', 'application.created', '23000000-0000-0000-0000-000000000002');
INSERT INTO public.automation_logs (company_id, rule_id, trigger_event) VALUES
  ('13000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 'application.created'),
  ('13000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002', 'application.created');

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.automation_rules', 'SELECT')
     OR has_table_privilege('anon', 'public.automation_logs', 'SELECT') THEN
    RAISE EXCEPTION 'Anonymous automation access exists';
  END IF;
  BEGIN
    INSERT INTO public.automation_logs (company_id, rule_id, trigger_event)
    VALUES ('13000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000001', 'application.created');
    RAISE EXCEPTION 'Cross-company automation log was linked';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '23000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE new_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.automation_rules) <> 1
     OR (SELECT count(*) FROM public.automation_logs) <> 1 THEN
    RAISE EXCEPTION 'Automation rows leaked across companies';
  END IF;
  INSERT INTO public.automation_rules (company_id, title, trigger_event, created_by)
  VALUES ('13000000-0000-0000-0000-000000000001', 'Automation fixture owner draft', 'application.created', auth.uid())
  RETURNING id INTO new_id;
  IF new_id IS NULL OR (SELECT is_active FROM public.automation_rules WHERE id=new_id) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Draft was not created with a generated UUID and inactive state';
  END IF;
  UPDATE public.automation_rules SET title='Automation fixture updated draft' WHERE id=new_id;
  BEGIN
    INSERT INTO public.automation_rules (company_id, title, trigger_event, created_by)
    VALUES ('13000000-0000-0000-0000-000000000002', 'Automation fixture cross draft', 'application.created', auth.uid());
    RAISE EXCEPTION 'Owner created a draft in another company';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.automation_rules (company_id, title, trigger_event, created_by)
    VALUES ('13000000-0000-0000-0000-000000000001', 'Automation fixture spoofed creator', 'application.created', '23000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Owner spoofed the draft creator';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.automation_rules SET is_active=true WHERE id=new_id;
    RAISE EXCEPTION 'Client activated an automation draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.automation_rules SET company_id='13000000-0000-0000-0000-000000000002' WHERE id=new_id;
    RAISE EXCEPTION 'Client moved an automation draft to another company';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.automation_logs (company_id, rule_id, trigger_event)
    VALUES ('13000000-0000-0000-0000-000000000001', new_id, 'application.created');
    RAISE EXCEPTION 'Client forged an execution log';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '23000000-0000-0000-0000-000000000003', true);
DO $$
DECLARE affected integer;
BEGIN
  IF (SELECT count(*) FROM public.automation_rules) <> 2 THEN
    RAISE EXCEPTION 'Company member cannot view company rules';
  END IF;
  BEGIN
    INSERT INTO public.automation_rules (company_id, title, trigger_event, created_by)
    VALUES ('13000000-0000-0000-0000-000000000001', 'Automation fixture member draft', 'application.created', auth.uid());
    RAISE EXCEPTION 'Non-owner created a draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  DELETE FROM public.automation_rules;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Non-owner deleted an automation rule'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
