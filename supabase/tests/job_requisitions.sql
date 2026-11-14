-- Disposable PostgreSQL migration-replay test suite for Phase 1 Manpower & Job Requisitions.
-- All synthetic fixtures and mutations roll back cleanly at the end of the transaction.
BEGIN;

SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data) VALUES
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'req-a-owner@example.test', '{}'::jsonb),
  ('71000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'req-a-hr@example.test', '{}'::jsonb),
  ('71000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'req-a-mgr@example.test', '{}'::jsonb),
  ('71000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'req-a-viewer@example.test', '{}'::jsonb),
  ('71000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'req-b-owner@example.test', '{}'::jsonb),
  ('71000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'req-job-seeker@example.test', '{}'::jsonb),
  ('71000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'req-a-branch@example.test', '{}'::jsonb);
SET LOCAL session_replication_role = origin;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('71000000-0000-0000-0000-000000000001', 'recruiter'),
  ('71000000-0000-0000-0000-000000000002', 'recruiter'),
  ('71000000-0000-0000-0000-000000000003', 'recruiter'),
  ('71000000-0000-0000-0000-000000000004', 'recruiter'),
  ('71000000-0000-0000-0000-000000000005', 'recruiter'),
  ('71000000-0000-0000-0000-000000000006', 'job_seeker'),
  ('71000000-0000-0000-0000-000000000007', 'recruiter');

-- Insert companies under origin role so subscription triggers provision free plans (limit = 2).
INSERT INTO public.companies (id, name, city, owner_user_id, status) VALUES
  ('71100000-0000-0000-0000-000000000001', 'Requisition Tenant A', 'Riyadh', '71000000-0000-0000-0000-000000000001', 'active'),
  ('71100000-0000-0000-0000-000000000002', 'Requisition Tenant B', 'Jeddah', '71000000-0000-0000-0000-000000000005', 'active');

INSERT INTO public.companies (id, name, city, owner_user_id, parent_company_id, status) VALUES
  ('71100000-0000-0000-0000-000000000003', 'Tenant A Jeddah Branch', 'Jeddah', '71000000-0000-0000-0000-000000000001', '71100000-0000-0000-0000-000000000001', 'active');

INSERT INTO public.company_members (company_id, user_id, member_role) VALUES
  ('71100000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'owner'),
  ('71100000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', 'hr'),
  ('71100000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000003', 'hr'),
  ('71100000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000004', 'viewer'),
  ('71100000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000005', 'owner'),
  ('71100000-0000-0000-0000-000000000003', '71000000-0000-0000-0000-000000000007', 'hr');

CREATE FUNCTION pg_temp.expect(ok boolean, msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERT FAILED: %', msg;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.expect_error(query text, expected_states text[], msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE query;
  RAISE EXCEPTION 'ASSERT FAILED (expected error %): %', expected_states, msg;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLSTATE = ANY (expected_states) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'ASSERT FAILED (%): expected SQLSTATE %, got % (%)', msg, expected_states, SQLSTATE, SQLERRM;
END;
$$;

DO $$
DECLARE
  co_a uuid := '71100000-0000-0000-0000-000000000001';
  co_b uuid := '71100000-0000-0000-0000-000000000002';
  co_a_branch uuid := '71100000-0000-0000-0000-000000000003';

  u_a_owner uuid := '71000000-0000-0000-0000-000000000001';
  u_a_hr uuid := '71000000-0000-0000-0000-000000000002';
  u_a_mgr uuid := '71000000-0000-0000-0000-000000000003';
  u_a_viewer uuid := '71000000-0000-0000-0000-000000000004';
  u_b_owner uuid := '71000000-0000-0000-0000-000000000005';
  u_seeker uuid := '71000000-0000-0000-0000-000000000006';
  u_a_branch uuid := '71000000-0000-0000-0000-000000000007';

  dept_a_eng uuid;
  dept_a_jeddah uuid;
  dept_b_eng uuid;
  req_1 uuid;
  req_2 uuid;
  req_3 uuid;
  req_row public.job_requisitions%ROWTYPE;
  job_id_1 uuid;
  job_id_2 uuid;
  affected_rows integer;
BEGIN
  -- --------------------------------------------------------------------------
  -- 1) Privilege & exposure checks
  -- --------------------------------------------------------------------------
  PERFORM pg_temp.expect(NOT has_table_privilege('anon', 'public.company_departments', 'SELECT'), 'anon can select company_departments');
  PERFORM pg_temp.expect(NOT has_table_privilege('anon', 'public.job_requisitions', 'SELECT'), 'anon can select job_requisitions');
  PERFORM pg_temp.expect(NOT has_table_privilege('anon', 'public.requisition_approvals', 'SELECT'), 'anon can select requisition_approvals');
  PERFORM pg_temp.expect(NOT has_table_privilege('authenticated', 'public.requisition_approvals', 'UPDATE'), 'authenticated has direct UPDATE on requisition_approvals');
  PERFORM pg_temp.expect(NOT has_function_privilege('anon', 'public.submit_job_requisition(uuid)', 'EXECUTE'), 'anon can execute submit_job_requisition');
  PERFORM pg_temp.expect(NOT has_function_privilege('anon', 'public.decide_job_requisition(uuid,text,text)', 'EXECUTE'), 'anon can execute decide_job_requisition');
  PERFORM pg_temp.expect(NOT has_function_privilege('anon', 'public.convert_requisition_to_job(uuid)', 'EXECUTE'), 'anon can execute convert_requisition_to_job');
  PERFORM pg_temp.expect(has_function_privilege('authenticated', 'public.submit_job_requisition(uuid)', 'EXECUTE'), 'authenticated missing submit_job_requisition');
  PERFORM pg_temp.expect(has_function_privilege('authenticated', 'public.decide_job_requisition(uuid,text,text)', 'EXECUTE'), 'authenticated missing decide_job_requisition');
  PERFORM pg_temp.expect(has_function_privilege('authenticated', 'public.convert_requisition_to_job(uuid)', 'EXECUTE'), 'authenticated missing convert_requisition_to_job');

  -- --------------------------------------------------------------------------
  -- 2) Department creation & functional unique index validation
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  INSERT INTO public.company_departments (company_id, name, branch_name, cost_center, manager_user_id)
  VALUES (co_a, 'Engineering', NULL, 'CC-ENG', u_a_mgr)
  RETURNING id INTO dept_a_eng;

  -- Duplicate case-insensitive name with empty branch_name must collide with NULL branch_name.
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.company_departments (company_id, name, branch_name) VALUES (%L, ''engineering'', '''')', co_a),
    ARRAY['23505'],
    'functional unique index allowed case-insensitive duplicate with empty branch_name'
  );

  -- Same department name under a distinct branch_name is allowed.
  INSERT INTO public.company_departments (company_id, name, branch_name)
  VALUES (co_a, 'Engineering', 'Jeddah')
  RETURNING id INTO dept_a_jeddah;

  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.company_departments (company_id, name, branch_name) VALUES (%L, ''ENGINEERING'', ''jeddah'')', co_a),
    ARRAY['23505'],
    'functional unique index allowed case-insensitive duplicate branch department'
  );

  -- Company A HR cannot move department to another company.
  PERFORM pg_temp.expect_error(
    format('UPDATE public.company_departments SET company_id = %L WHERE id = %L', co_b, dept_a_eng),
    ARRAY['42501'],
    'department company_id changed by authenticated user'
  );

  EXECUTE 'RESET ROLE';

  -- Viewer cannot create, update, or delete departments.
  PERFORM set_config('request.jwt.claim.sub', u_a_viewer::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.company_departments (company_id, name) VALUES (%L, ''Finance'')', co_a),
    ARRAY['42501'],
    'viewer inserted department'
  );
  UPDATE public.company_departments SET name = 'Tampered' WHERE id = dept_a_eng;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  PERFORM pg_temp.expect(affected_rows = 0, 'viewer updated department');
  EXECUTE 'RESET ROLE';

  -- Company B owner can create 'Engineering' in Company B.
  PERFORM set_config('request.jwt.claim.sub', u_b_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.company_departments (company_id, name)
  VALUES (co_b, 'Engineering')
  RETURNING id INTO dept_b_eng;
  EXECUTE 'RESET ROLE';

  -- --------------------------------------------------------------------------
  -- 3) Invalid headcount, budget, and direct status tampering checks
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested) VALUES (%L, %L, ''Zero HC'', 0)', co_a, dept_a_eng),
    ARRAY['23514'],
    'headcount_requested = 0 accepted'
  );
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested) VALUES (%L, %L, ''Over HC'', 501)', co_a, dept_a_eng),
    ARRAY['23514'],
    'headcount_requested = 501 accepted'
  );
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested, headcount_filled) VALUES (%L, %L, ''Negative filled'', 1, -1)', co_a, dept_a_eng),
    ARRAY['23514', '42501'],
    'negative headcount_filled accepted'
  );
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested, budget_min, budget_max) VALUES (%L, %L, ''Bad Budget'', 2, 25000, 15000)', co_a, dept_a_eng),
    ARRAY['23514'],
    'budget_max < budget_min accepted'
  );
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested, budget_min) VALUES (%L, %L, ''Neg Budget'', 2, -100)', co_a, dept_a_eng),
    ARRAY['23514'],
    'negative budget_min accepted'
  );
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested, priority) VALUES (%L, %L, ''Bad Priority'', 2, ''critical'')', co_a, dept_a_eng),
    ARRAY['23514'],
    'invalid priority accepted'
  );
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested, status) VALUES (%L, %L, ''Skip Approval'', 1, ''approved'')', co_a, dept_a_eng),
    ARRAY['42501'],
    'direct insert with approved status accepted'
  );
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested, requested_by) VALUES (%L, %L, ''Spoofed'', 1, %L)', co_a, dept_a_eng, u_a_owner),
    ARRAY['42501'],
    'spoofed requested_by accepted'
  );

  -- Cross-tenant department FK check (Company A requisition linking Company B department).
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested) VALUES (%L, %L, ''Cross-Tenant Dept'', 1)', co_a, dept_b_eng),
    ARRAY['23503'],
    'cross-tenant department_id accepted for authenticated user'
  );

  EXECUTE 'RESET ROLE';

  -- Verify composite FK protects against cross-tenant department_id even as superuser/postgres.
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.job_requisitions (company_id, department_id, title, headcount_requested, requested_by) VALUES (%L, %L, ''Service Cross-Tenant'', 1, %L)', co_a, dept_b_eng, u_a_owner),
    ARRAY['23503'],
    'composite FK failed to block cross-tenant department_id'
  );

  -- --------------------------------------------------------------------------
  -- 4) Create requisition, submit, reject, resubmit, approve (ad-hoc admin flow)
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  INSERT INTO public.job_requisitions (
    company_id, department_id, branch_name, title, employment_type,
    headcount_requested, budget_min, budget_max, currency, priority,
    justification, requirements
  ) VALUES (
    co_a, dept_a_eng, 'Riyadh HQ', 'Senior Backend Engineer', 'full_time',
    2, 12000, 18000, 'SAR', 'high',
    'Scale core recruitment APIs', E'PostgreSQL expertise\nTypeScript & Supabase'
  )
  RETURNING id INTO req_1;

  -- Direct UPDATE to approved must be rejected.
  PERFORM pg_temp.expect_error(
    format('UPDATE public.job_requisitions SET status = ''approved'' WHERE id = %L', req_1),
    ARRAY['42501'],
    'direct status transition to approved accepted'
  );

  -- Non-admin HR cannot self-insert an approval step.
  PERFORM pg_temp.expect_error(
    format('INSERT INTO public.requisition_approvals (company_id, requisition_id, step_order, approver_user_id) VALUES (%L, %L, 1, %L)', co_a, req_1, u_a_hr),
    ARRAY['42501'],
    'non-admin inserted requisition_approvals row'
  );

  -- Cannot convert draft requisition.
  PERFORM pg_temp.expect_error(
    format('SELECT public.convert_requisition_to_job(%L)', req_1),
    ARRAY['22023'],
    'draft requisition converted to job'
  );

  EXECUTE 'RESET ROLE';

  -- Viewer cannot submit.
  PERFORM set_config('request.jwt.claim.sub', u_a_viewer::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect_error(
    format('SELECT public.submit_job_requisition(%L)', req_1),
    ARRAY['42501'],
    'viewer submitted requisition'
  );
  EXECUTE 'RESET ROLE';

  -- HR submits draft.
  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  req_row := public.submit_job_requisition(req_1);
  PERFORM pg_temp.expect(req_row.status = 'pending_approval', 'submit did not set pending_approval');

  -- Cannot mutate spec fields while pending_approval.
  PERFORM pg_temp.expect_error(
    format('UPDATE public.job_requisitions SET budget_max = 99000 WHERE id = %L', req_1),
    ARRAY['42501'],
    'pending_approval requisition budget edited'
  );

  -- Non-approver denial: HR (requester, non-admin) cannot decide their own requisition.
  PERFORM pg_temp.expect_error(
    format('SELECT public.decide_job_requisition(%L, ''approved'', ''Self approve'')', req_1),
    ARRAY['42501'],
    'non-approver HR approved requisition'
  );
  EXECUTE 'RESET ROLE';

  -- Non-approver denial: Viewer cannot decide.
  PERFORM set_config('request.jwt.claim.sub', u_a_viewer::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect_error(
    format('SELECT public.decide_job_requisition(%L, ''approved'', ''Viewer approve'')', req_1),
    ARRAY['42501'],
    'viewer approved requisition'
  );
  EXECUTE 'RESET ROLE';

  -- Cross-tenant denial: Company B owner sees 0 rows and cannot decide or convert.
  PERFORM set_config('request.jwt.claim.sub', u_b_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect((SELECT count(*) FROM public.company_departments WHERE company_id = co_a) = 0, 'Company B saw Company A departments');
  PERFORM pg_temp.expect((SELECT count(*) FROM public.job_requisitions WHERE company_id = co_a) = 0, 'Company B saw Company A requisitions');
  PERFORM pg_temp.expect((SELECT count(*) FROM public.requisition_approvals WHERE company_id = co_a) = 0, 'Company B saw Company A approvals');
  PERFORM pg_temp.expect_error(
    format('SELECT public.submit_job_requisition(%L)', req_1),
    ARRAY['42501'],
    'Company B submitted Company A requisition'
  );
  PERFORM pg_temp.expect_error(
    format('SELECT public.decide_job_requisition(%L, ''approved'', ''Cross tenant'')', req_1),
    ARRAY['42501'],
    'Company B decided Company A requisition'
  );
  PERFORM pg_temp.expect_error(
    format('SELECT public.convert_requisition_to_job(%L)', req_1),
    ARRAY['42501'],
    'Company B converted Company A requisition'
  );
  EXECUTE 'RESET ROLE';

  -- Job seeker sees 0 rows and cannot invoke any workflow RPC.
  PERFORM set_config('request.jwt.claim.sub', u_seeker::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect((SELECT count(*) FROM public.job_requisitions) = 0, 'job_seeker saw job_requisitions');
  PERFORM pg_temp.expect_error(
    format('SELECT public.decide_job_requisition(%L, ''approved'', ''Seeker'')', req_1),
    ARRAY['42501'],
    'job_seeker decided requisition'
  );
  EXECUTE 'RESET ROLE';

  -- Owner rejects requisition with reason -> HR edits -> resubmits -> Owner approves.
  PERFORM set_config('request.jwt.claim.sub', u_a_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  req_row := public.decide_job_requisition(req_1, 'rejected', 'Adjust budget to 17000');
  PERFORM pg_temp.expect(req_row.status = 'rejected' AND req_row.rejection_reason = 'Adjust budget to 17000', 'rejection state incorrect');
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.job_requisitions SET budget_max = 17000 WHERE id = req_1;
  req_row := public.submit_job_requisition(req_1);
  PERFORM pg_temp.expect(req_row.status = 'pending_approval' AND req_row.rejection_reason IS NULL, 'resubmit did not clear rejection_reason');
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claim.sub', u_a_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  req_row := public.decide_job_requisition(req_1, 'approved', 'Budget confirmed');
  PERFORM pg_temp.expect(req_row.status = 'approved' AND req_row.approved_by = u_a_owner AND req_row.approved_at IS NOT NULL, 'approval fields not set');
  EXECUTE 'RESET ROLE';

  -- Post-approval tampering must fail.
  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect_error(
    format('UPDATE public.job_requisitions SET headcount_requested = 25 WHERE id = %L', req_1),
    ARRAY['42501'],
    'approved requisition headcount tampered'
  );
  EXECUTE 'RESET ROLE';

  -- --------------------------------------------------------------------------
  -- 5) Multi-step approval chain & branch hierarchy checks
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.job_requisitions (
    company_id, branch_name, title, employment_type, headcount_requested, priority
  ) VALUES (
    co_a_branch, 'Jeddah Branch', 'Branch Coordinator', 'part_time', 1, 'medium'
  )
  RETURNING id INTO req_2;
  EXECUTE 'RESET ROLE';

  -- Parent company owner configures 2-step approval chain (Step 1: u_a_mgr, Step 2: u_a_owner).
  PERFORM set_config('request.jwt.claim.sub', u_a_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.requisition_approvals (company_id, requisition_id, step_order, approver_user_id) VALUES
    (co_a_branch, req_2, 1, u_a_mgr),
    (co_a_branch, req_2, 2, u_a_owner);
  req_row := public.submit_job_requisition(req_2);
  PERFORM pg_temp.expect(req_row.status = 'pending_approval', 'branch req_2 submit failed');

  -- Step 2 approver (owner) cannot bypass Step 1 approver!
  PERFORM pg_temp.expect_error(
    format('SELECT public.decide_job_requisition(%L, ''approved'', ''Skipping step 1'')', req_2),
    ARRAY['42501'],
    'Step 2 approver bypassed Step 1 approver'
  );
  EXECUTE 'RESET ROLE';

  -- Step 1 approver approves -> stays pending_approval for Step 2.
  PERFORM set_config('request.jwt.claim.sub', u_a_mgr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  req_row := public.decide_job_requisition(req_2, 'approved', 'Step 1 cleared');
  PERFORM pg_temp.expect(req_row.status = 'pending_approval', 'multi-step approved prematurely after Step 1');
  PERFORM pg_temp.expect_error(
    format('SELECT public.decide_job_requisition(%L, ''approved'', ''Double approve'')', req_2),
    ARRAY['42501'],
    'Step 1 approver approved Step 2'
  );
  EXECUTE 'RESET ROLE';

  -- Step 2 approver approves -> becomes approved.
  PERFORM set_config('request.jwt.claim.sub', u_a_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  req_row := public.decide_job_requisition(req_2, 'approved', 'Final approval');
  PERFORM pg_temp.expect(req_row.status = 'approved' AND req_row.approved_by = u_a_owner, 'Step 2 did not finalize approval');
  EXECUTE 'RESET ROLE';

  -- Branch-scoped member sees branch req_2, NOT parent req_1.
  PERFORM set_config('request.jwt.claim.sub', u_a_branch::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect((SELECT count(*) FROM public.job_requisitions WHERE id = req_2) = 1, 'branch member could not see branch requisition');
  PERFORM pg_temp.expect((SELECT count(*) FROM public.job_requisitions WHERE id = req_1) = 0, 'branch member saw parent company requisition');
  EXECUTE 'RESET ROLE';

  -- --------------------------------------------------------------------------
  -- 6) Requisition-to-job conversion, granular permissions & quota checks
  -- --------------------------------------------------------------------------
  -- Viewer denied conversion.
  PERFORM set_config('request.jwt.claim.sub', u_a_viewer::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect_error(
    format('SELECT public.convert_requisition_to_job(%L)', req_1),
    ARRAY['42501'],
    'viewer converted requisition to job'
  );
  EXECUTE 'RESET ROLE';

  -- Granular deny on jobs.create blocks HR conversion.
  INSERT INTO public.granular_permissions (company_id, role_key, user_id, module_key, can_read, can_create, can_edit, can_delete)
  VALUES (co_a, 'user:' || u_a_hr::text, u_a_hr, 'jobs', true, false, true, false);

  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect_error(
    format('SELECT public.convert_requisition_to_job(%L)', req_1),
    ARRAY['42501'],
    'granular permission jobs.create=false did not block conversion'
  );
  EXECUTE 'RESET ROLE';

  DELETE FROM public.granular_permissions WHERE company_id = co_a AND user_id = u_a_hr;

  -- HR converts approved req_1 to a live job.
  PERFORM set_config('request.jwt.claim.sub', u_a_hr::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  job_id_1 := public.convert_requisition_to_job(req_1);
  PERFORM pg_temp.expect(job_id_1 IS NOT NULL, 'convert_requisition_to_job returned NULL');

  PERFORM pg_temp.expect(
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id_1
        AND j.company_id = co_a
        AND j.title = 'Senior Backend Engineer'
        AND j.department = 'Engineering'
        AND j.location = 'Riyadh HQ'
        AND j.type = 'full_time'
        AND j.status = 'نشطة'
        AND j.salary_min = 12000
        AND j.salary_max = 17000
        AND j.requirements = ARRAY['PostgreSQL expertise', 'TypeScript & Supabase']
    ),
    'converted job row columns do not match requisition'
  );

  PERFORM pg_temp.expect(
    EXISTS (
      SELECT 1 FROM public.job_requisitions r
      WHERE r.id = req_1 AND r.status = 'converted' AND r.linked_job_id = job_id_1
    ),
    'requisition status or linked_job_id not updated after conversion'
  );

  -- Repeat conversion must fail without creating duplicate job.
  PERFORM pg_temp.expect_error(
    format('SELECT public.convert_requisition_to_job(%L)', req_1),
    ARRAY['22023'],
    'requisition converted twice'
  );
  EXECUTE 'RESET ROLE';

  -- Parent owner converts branch req_2 (uses 2nd of 2 free job slots on co_a).
  PERFORM set_config('request.jwt.claim.sub', u_a_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  job_id_2 := public.convert_requisition_to_job(req_2);
  PERFORM pg_temp.expect(
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id_2 AND j.company_id = co_a_branch AND j.department = 'عام' AND j.location = 'Jeddah Branch'
    ),
    'branch requisition converted job missing fallback department or branch location'
  );

  -- Create & approve a 3rd requisition; conversion must fail on quota (limit = 2) and keep status='approved'.
  INSERT INTO public.job_requisitions (company_id, title, headcount_requested)
  VALUES (co_a, 'Over-Quota Engineer', 1)
  RETURNING id INTO req_3;
  PERFORM public.submit_job_requisition(req_3);
  PERFORM public.decide_job_requisition(req_3, 'approved', 'Quota check');
  PERFORM pg_temp.expect_error(
    format('SELECT public.convert_requisition_to_job(%L)', req_3),
    ARRAY['23514'],
    'over-quota job conversion succeeded'
  );
  PERFORM pg_temp.expect(
    EXISTS (SELECT 1 FROM public.job_requisitions r WHERE r.id = req_3 AND r.status = 'approved' AND r.linked_job_id IS NULL),
    'failed quota conversion mutated requisition state'
  );
  EXECUTE 'RESET ROLE';

  -- --------------------------------------------------------------------------
  -- 7) Banned user and suspended parent company isolation
  -- --------------------------------------------------------------------------
  UPDATE auth.users SET banned_until = now() + interval '1 day' WHERE id = u_a_owner;
  PERFORM set_config('request.jwt.claim.sub', u_a_owner::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect((SELECT count(*) FROM public.job_requisitions WHERE company_id = co_a) = 0, 'banned owner read job_requisitions');
  PERFORM pg_temp.expect_error(
    format('SELECT public.convert_requisition_to_job(%L)', req_3),
    ARRAY['42501'],
    'banned owner executed convert_requisition_to_job'
  );
  EXECUTE 'RESET ROLE';
  UPDATE auth.users SET banned_until = NULL WHERE id = u_a_owner;

  -- Suspending parent company blocks branch access as well.
  UPDATE public.companies SET status = 'suspended' WHERE id = co_a;
  PERFORM set_config('request.jwt.claim.sub', u_a_branch::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM pg_temp.expect((SELECT count(*) FROM public.job_requisitions WHERE company_id = co_a_branch) = 0, 'suspended parent still allowed branch requisition reads');
  EXECUTE 'RESET ROLE';
END $$;

ROLLBACK;
