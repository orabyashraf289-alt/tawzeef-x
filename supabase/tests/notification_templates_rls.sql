-- Disposable replay database only. Fixtures are rolled back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('24000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'template-owner@example.test'),
  ('24000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'template-hr@example.test'),
  ('24000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'template-viewer@example.test'),
  ('24000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'template-other-owner@example.test');
SET LOCAL session_replication_role = origin;
INSERT INTO public.companies (id, name, status) VALUES
  ('14000000-0000-0000-0000-000000000001', 'Template fixture parent', 'active'),
  ('14000000-0000-0000-0000-000000000002', 'Template fixture other company', 'active'),
  ('14000000-0000-0000-0000-000000000003', 'Template fixture branch', 'active'),
  ('14000000-0000-0000-0000-000000000004', 'Template fixture inactive company', 'inactive');
UPDATE public.companies SET parent_company_id = '14000000-0000-0000-0000-000000000001'
WHERE id = '14000000-0000-0000-0000-000000000003';
INSERT INTO public.company_members (company_id, user_id, member_role) VALUES
  ('14000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'owner'),
  ('14000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000002', 'hr'),
  ('14000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000003', 'viewer'),
  ('14000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000004', 'owner'),
  ('14000000-0000-0000-0000-000000000004', '24000000-0000-0000-0000-000000000001', 'owner');
INSERT INTO public.notification_templates (company_id, type, subject, body_html) VALUES
  ('14000000-0000-0000-0000-000000000001', 'approval', 'Parent template', '<p>Parent</p>'),
  ('14000000-0000-0000-0000-000000000002', 'approval', 'Other template', '<p>Other</p>'),
  ('14000000-0000-0000-0000-000000000003', 'approval', 'Branch template', '<p>Branch</p>');

DO $$ BEGIN
  IF has_table_privilege('anon', 'public.notification_templates', 'SELECT')
    OR has_function_privilege('anon', 'public.can_manage_notification_templates(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous template access exists';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '24000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected integer; BEGIN
  IF (SELECT count(*) FROM public.notification_templates) <> 2 THEN
    RAISE EXCEPTION 'Template rows leaked across companies';
  END IF;
  INSERT INTO public.notification_templates (company_id, type, subject, body_html)
  VALUES ('14000000-0000-0000-0000-000000000003', 'assessment', 'Owner branch template', '<p>Assessment</p>');
  UPDATE public.notification_templates SET subject = 'Owner updated branch template'
  WHERE company_id = '14000000-0000-0000-0000-000000000003' AND type = 'approval';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Parent owner cannot update branch template'; END IF;
  BEGIN
    INSERT INTO public.notification_templates (company_id, type, subject, body_html)
    VALUES ('14000000-0000-0000-0000-000000000002', 'rejection', 'Cross tenant', '<p>Blocked</p>');
    RAISE EXCEPTION 'Owner inserted another company template';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.notification_templates SET company_id = '14000000-0000-0000-0000-000000000002'
    WHERE company_id = '14000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'Owner moved a template across tenants';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.notification_templates (company_id, type, subject, body_html)
    VALUES ('14000000-0000-0000-0000-000000000004', 'approval', 'Inactive', '<p>Blocked</p>');
    RAISE EXCEPTION 'Owner edited an inactive company template';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub', '24000000-0000-0000-0000-000000000002', true);
DO $$ DECLARE affected integer; BEGIN
  IF NOT public.can_manage_notification_templates('14000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'Parent HR cannot manage branch templates';
  END IF;
  UPDATE public.notification_templates SET subject = 'HR updated branch template'
  WHERE company_id = '14000000-0000-0000-0000-000000000003' AND type = 'approval';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Parent HR update failed'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '24000000-0000-0000-0000-000000000003', true);
DO $$ DECLARE affected integer; BEGIN
  IF (SELECT count(*) FROM public.notification_templates) <> 3
    OR public.can_manage_notification_templates('14000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'Viewer read/edit permissions are incorrect';
  END IF;
  UPDATE public.notification_templates SET subject = 'Viewer overwrite';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Viewer updated a template'; END IF;
  BEGIN
    INSERT INTO public.notification_templates (company_id, type, subject, body_html)
    VALUES ('14000000-0000-0000-0000-000000000001', 'rejection', 'Viewer insert', '<p>Blocked</p>');
    RAISE EXCEPTION 'Viewer inserted a template';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.notification_templates;
    RAISE EXCEPTION 'Authenticated user received template deletion access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
UPDATE public.companies SET status = 'inactive' WHERE id = '14000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub', '24000000-0000-0000-0000-000000000002', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.can_manage_notification_templates('14000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'An inactive parent can still edit branch templates';
  END IF;
END $$;
ROLLBACK;
