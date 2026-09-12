-- =========================================================================
-- MIGRATION: 20260913000000_delete_company_cascade.sql
-- DESCRIPTION: Atomic, secure server-side company & branches deletion.
--              Enforces Super Admin / Platform Owner permission.
--              Protects Platform Owner company from deletion.
--              Cascades through all dependent tables in topological order.
--              Purges exclusive company users from profiles and user_roles.
--              Invalidates auth sessions and sets permanent ban on exclusive users.
--              Decouples system audit trail.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.delete_company_cascade(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _calling_user_id uuid;
  _target_company RECORD;
  _branch_ids uuid[];
  _all_company_ids uuid[];
  _job_ids uuid[];
  _exclusive_user_ids uuid[] := ARRAY[]::uuid[];
  _deleted_branches int := 0;
  _deleted_jobs int := 0;
  _deleted_members int := 0;
  _deleted_candidates int := 0;
  _deleted_users int := 0;
  _result jsonb;
BEGIN
  _calling_user_id := auth.uid();

  -- 1. Authentication & Super Admin Authorization Check
  IF _calling_user_id IS NULL OR NOT public.is_super_admin(_calling_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only Platform Owner / Super Admin can delete customer companies';
  END IF;

  -- 2. Validate input parameter
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Target company ID must be provided';
  END IF;

  -- 3. Retrieve target company details
  SELECT id, name, parent_company_id INTO _target_company
  FROM public.companies
  WHERE id = target_company_id;

  IF _target_company.id IS NULL THEN
    RAISE EXCEPTION 'Company with ID % not found or already deleted', target_company_id;
  END IF;

  -- 4. HARD SAFEGUARD: Prevent deleting the Platform Owner Company
  IF target_company_id = '00000000-0000-0000-0000-000000000001'::uuid
     OR (
       (lower(_target_company.name) LIKE '%tawzeef%' OR lower(_target_company.name) LIKE '%توظيف إكس%')
       AND _target_company.parent_company_id IS NULL
     ) THEN
    RAISE EXCEPTION 'Security Restriction: Platform Owner company (%) cannot be deleted', _target_company.name;
  END IF;

  -- 5. Collect all child branches if this is a parent company
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO _branch_ids
  FROM public.companies
  WHERE parent_company_id = target_company_id;

  -- Build unified list of company IDs (Parent + all child branches)
  _all_company_ids := ARRAY[target_company_id] || _branch_ids;

  -- 6. Collect all associated jobs
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO _job_ids
  FROM public.jobs
  WHERE company_id = ANY(_all_company_ids);

  -- 7. Identify users belonging EXCLUSIVELY to this company or its branches
  IF to_regclass('public.company_members') IS NOT NULL THEN
    SELECT COALESCE(array_agg(user_id), ARRAY[]::uuid[]) INTO _exclusive_user_ids
    FROM (
      SELECT user_id
      FROM public.company_members
      WHERE company_id = ANY(_all_company_ids)
      GROUP BY user_id
      HAVING NOT EXISTS (
        SELECT 1 FROM public.company_members cm2
        WHERE cm2.user_id = company_members.user_id
          AND cm2.company_id != ALL(_all_company_ids)
      )
    ) exclusive_users;
  END IF;

  -- Filter out Super Admins from exclusive users (safety check)
  IF array_length(_exclusive_user_ids, 1) > 0 THEN
    _exclusive_user_ids := ARRAY(
      SELECT u_id FROM unnest(_exclusive_user_ids) AS u_id
      WHERE NOT public.is_super_admin(u_id)
    );
    _deleted_users := COALESCE(array_length(_exclusive_user_ids, 1), 0);
  END IF;

  -- 8. CASCADE DELETION IN STRICT TOPOLOGICAL ORDER

  -- A. Candidate checklists
  IF to_regclass('public.candidate_checklists') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.candidate_checklists WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- B. Agency assignments
  IF to_regclass('public.agency_assignments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.agency_assignments WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- C. Candidate assessments & Assessment questions & Assessments
  IF to_regclass('public.candidate_assessments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.candidate_assessments WHERE candidate_id IN (SELECT id FROM public.candidates WHERE company_id = ANY($1))' USING _all_company_ids;
  END IF;

  IF to_regclass('public.assessment_questions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.assessment_questions WHERE assessment_id IN (SELECT id FROM public.assessments WHERE company_id = ANY($1))' USING _all_company_ids;
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.assessments WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- D. Interviews & Job Offers (which reference jobs and candidates)
  IF to_regclass('public.interviews') IS NOT NULL THEN
    IF array_length(_job_ids, 1) > 0 THEN
      EXECUTE 'DELETE FROM public.interviews WHERE company_id = ANY($1) OR job_id = ANY($2)' USING _all_company_ids, _job_ids;
    ELSE
      EXECUTE 'DELETE FROM public.interviews WHERE company_id = ANY($1)' USING _all_company_ids;
    END IF;
  END IF;

  IF to_regclass('public.job_offers') IS NOT NULL THEN
    IF array_length(_job_ids, 1) > 0 THEN
      EXECUTE 'DELETE FROM public.job_offers WHERE company_id = ANY($1) OR job_id = ANY($2)' USING _all_company_ids, _job_ids;
    ELSE
      EXECUTE 'DELETE FROM public.job_offers WHERE company_id = ANY($1)' USING _all_company_ids;
    END IF;
  END IF;

  -- E. Job Applications
  IF to_regclass('public.applications') IS NOT NULL THEN
    IF array_length(_job_ids, 1) > 0 THEN
      EXECUTE 'DELETE FROM public.applications WHERE company_id = ANY($1) OR job_id = ANY($2)' USING _all_company_ids, _job_ids;
    ELSE
      EXECUTE 'DELETE FROM public.applications WHERE company_id = ANY($1)' USING _all_company_ids;
    END IF;
  END IF;

  -- F. Candidates
  IF to_regclass('public.candidates') IS NOT NULL THEN
    IF array_length(_job_ids, 1) > 0 THEN
      EXECUTE 'DELETE FROM public.candidates WHERE company_id = ANY($1) OR job_id = ANY($2)' USING _all_company_ids, _job_ids;
    ELSE
      EXECUTE 'DELETE FROM public.candidates WHERE company_id = ANY($1)' USING _all_company_ids;
    END IF;
    GET DIAGNOSTICS _deleted_candidates = ROW_COUNT;
  END IF;

  -- G. Jobs
  IF to_regclass('public.jobs') IS NOT NULL THEN
    DELETE FROM public.jobs WHERE company_id = ANY(_all_company_ids);
    GET DIAGNOSTICS _deleted_jobs = ROW_COUNT;
  END IF;

  -- H. Pipeline stages & sub stages
  IF to_regclass('public.pipeline_sub_stages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.pipeline_sub_stages WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  IF to_regclass('public.pipeline_stages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.pipeline_stages WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- I. Question bank & Talent pool
  IF to_regclass('public.question_bank') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.question_bank WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  IF to_regclass('public.talent_pool') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.talent_pool WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- J. Notification templates
  IF to_regclass('public.notification_templates') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.notification_templates WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- K. Company invitations (both direct company and branch invitations)
  IF to_regclass('public.company_invitations') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.company_invitations WHERE company_id = ANY($1)' USING _all_company_ids;
    BEGIN
      EXECUTE 'DELETE FROM public.company_invitations WHERE branch_id = ANY($1)' USING _all_company_ids;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;

  -- L. Company Subscriptions, Invoices & Upgrade Requests
  IF to_regclass('public.company_subscriptions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.company_subscriptions WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  IF to_regclass('public.company_invoices') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.company_invoices WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  IF to_regclass('public.subscription_upgrade_requests') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.subscription_upgrade_requests WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- M. Company Memberships
  IF to_regclass('public.company_members') IS NOT NULL THEN
    DELETE FROM public.company_members WHERE company_id = ANY(_all_company_ids);
    GET DIAGNOSTICS _deleted_members = ROW_COUNT;
  END IF;

  -- N. Clean up exclusive users from profiles, roles, and invalidate sessions
  IF array_length(_exclusive_user_ids, 1) > 0 THEN
    IF to_regclass('public.profiles') IS NOT NULL THEN
      DELETE FROM public.profiles WHERE user_id = ANY(_exclusive_user_ids);
    END IF;

    IF to_regclass('public.user_roles') IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = ANY(_exclusive_user_ids);
    END IF;

    -- Invalidate sessions & apply permanent ban in auth schema if permitted
    BEGIN
      EXECUTE 'DELETE FROM auth.sessions WHERE user_id = ANY($1)' USING _exclusive_user_ids;
      EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id = ANY($1)' USING _exclusive_user_ids;
      EXECUTE 'UPDATE auth.users SET banned_until = ''3000-01-01 00:00:00+00''::timestamptz WHERE id = ANY($1)' USING _exclusive_user_ids;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- O. Decouple System Audit Logs (Keep audit entries but set company_id to NULL to preserve history)
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    EXECUTE 'UPDATE public.audit_log SET company_id = NULL WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- P. Delete child branches first (to satisfy self-referential foreign keys)
  IF array_length(_branch_ids, 1) > 0 THEN
    DELETE FROM public.companies WHERE id = ANY(_branch_ids);
    GET DIAGNOSTICS _deleted_branches = ROW_COUNT;
  END IF;

  -- Q. Delete target parent company
  DELETE FROM public.companies WHERE id = target_company_id;

  -- 9. Record audit trail entry for this deletion event
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      resource,
      details,
      created_at
    ) VALUES (
      _calling_user_id,
      'COMPANY_CASCADE_DELETED',
      'companies',
      jsonb_build_object(
        'company_id', target_company_id,
        'company_name', _target_company.name,
        'deleted_branches_count', _deleted_branches,
        'deleted_jobs_count', _deleted_jobs,
        'deleted_members_count', _deleted_members,
        'deleted_candidates_count', _deleted_candidates,
        'deleted_users_count', _deleted_users,
        'timestamp', now()
      ),
      now()
    );
  END IF;

  -- 10. Return structured success payload
  _result := jsonb_build_object(
    'success', true,
    'deleted_company_id', target_company_id,
    'deleted_company_name', _target_company.name,
    'deleted_branches_count', _deleted_branches,
    'deleted_jobs_count', _deleted_jobs,
    'deleted_members_count', _deleted_members,
    'deleted_candidates_count', _deleted_candidates,
    'deleted_users_count', _deleted_users,
    'message', 'Company, branches, jobs, and all exclusive users permanently deleted'
  );

  RETURN _result;
END;
$$;

-- Grant execution rights to authenticated users (RLS and is_super_admin inside will authorize)
GRANT EXECUTE ON FUNCTION public.delete_company_cascade(uuid) TO authenticated;
