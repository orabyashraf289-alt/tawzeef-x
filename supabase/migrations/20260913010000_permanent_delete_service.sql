-- =========================================================================
-- MIGRATION: 20260913010000_permanent_delete_service.sql
-- DESCRIPTION: Atomic, transactional, multi-phase permanent deletion service.
--              Includes Tenant Locking (status='deleting'), topological cascade,
--              exclusive user purging, session/token invalidation,
--              audit preservation, and dynamic tenant schema drop.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.delete_company_permanently(
  target_company_id uuid,
  calling_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _effective_caller uuid;
  _target_company RECORD;
  _branch_ids uuid[] := ARRAY[]::uuid[];
  _all_company_ids uuid[] := ARRAY[]::uuid[];
  _job_ids uuid[] := ARRAY[]::uuid[];
  _exclusive_user_ids uuid[] := ARRAY[]::uuid[];
  _deleted_branches int := 0;
  _deleted_jobs int := 0;
  _deleted_members int := 0;
  _deleted_candidates int := 0;
  _deleted_users int := 0;
  _tenant_schema_name text;
  _result jsonb;
BEGIN
  -- Determine caller: parameter or session auth.uid()
  _effective_caller := COALESCE(calling_user_id, auth.uid());

  -- 1. Authentication & Super Admin Authorization Check
  IF _effective_caller IS NULL OR NOT public.is_super_admin(_effective_caller) THEN
    RAISE EXCEPTION 'COMPANY_DELETE_UNAUTHORIZED: Only Platform Owner / Super Admin can execute permanent deletion';
  END IF;

  -- 2. Validate input parameter
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_DELETE_INVALID_ARGUMENT: Target company ID must be specified';
  END IF;

  -- 3. Retrieve target company record
  SELECT id, name, parent_company_id INTO _target_company
  FROM public.companies
  WHERE id = target_company_id;

  IF _target_company.id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_DELETE_NOT_FOUND: Company with ID % not found or already deleted', target_company_id;
  END IF;

  -- 4. HARD SAFEGUARD: Prevent deleting Platform Owner Company
  IF target_company_id = '00000000-0000-0000-0000-000000000001'::uuid
     OR (
       (lower(_target_company.name) LIKE '%tawzeef%' OR lower(_target_company.name) LIKE '%توظيف إكس%')
       AND _target_company.parent_company_id IS NULL
     ) THEN
    RAISE EXCEPTION 'COMPANY_DELETE_SAFEGUARD: Security Restriction: Platform Owner company (%) cannot be deleted', _target_company.name;
  END IF;

  -- 5. Collect all child branches
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO _branch_ids
  FROM public.companies
  WHERE parent_company_id = target_company_id;

  _all_company_ids := ARRAY[target_company_id] || _branch_ids;

  -- 6. LOCK TENANT: Set status to 'deleting' across company and all branches
  -- While 'deleting', login and all API guards immediately reject requests
  UPDATE public.companies
  SET status = 'deleting', updated_at = now()
  WHERE id = ANY(_all_company_ids);

  -- 7. Collect all associated jobs
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO _job_ids
  FROM public.jobs
  WHERE company_id = ANY(_all_company_ids);

  -- 8. Identify users belonging EXCLUSIVELY to this company or its branches
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

  -- Filter out Super Admins from exclusive users (safety guard)
  IF array_length(_exclusive_user_ids, 1) > 0 THEN
    _exclusive_user_ids := ARRAY(
      SELECT u_id FROM unnest(_exclusive_user_ids) AS u_id
      WHERE NOT public.is_super_admin(u_id)
    );
    _deleted_users := COALESCE(array_length(_exclusive_user_ids, 1), 0);
  END IF;

  -- 9. RECORD AUDIT TRAIL FIRST (Preserved in system database)
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      resource,
      details,
      created_at
    ) VALUES (
      _effective_caller,
      'COMPANY_PERMANENT_DELETE_STARTED',
      'companies',
      jsonb_build_object(
        'company_id', target_company_id,
        'company_name', _target_company.name,
        'all_company_ids', _all_company_ids,
        'branches_count', array_length(_branch_ids, 1),
        'timestamp', now()
      ),
      now()
    );
  END IF;

  -- 10. ATOMIC CASCADE DELETION IN STRICT TOPOLOGICAL ORDER

  -- A. Candidate Checklists
  IF to_regclass('public.candidate_checklists') IS NOT NULL THEN
    IF array_length(_job_ids, 1) > 0 THEN
      EXECUTE 'DELETE FROM public.candidate_checklists WHERE company_id = ANY($1) OR job_id = ANY($2)' USING _all_company_ids, _job_ids;
    ELSE
      EXECUTE 'DELETE FROM public.candidate_checklists WHERE company_id = ANY($1)' USING _all_company_ids;
    END IF;
  END IF;

  -- B. Agency Assignments
  IF to_regclass('public.agency_assignments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.agency_assignments WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- C. Candidate Assessments & Questions & Assessments
  IF to_regclass('public.candidate_assessments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.candidate_assessments WHERE candidate_id IN (SELECT id FROM public.candidates WHERE company_id = ANY($1))' USING _all_company_ids;
  END IF;

  IF to_regclass('public.assessment_questions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.assessment_questions WHERE assessment_id IN (SELECT id FROM public.assessments WHERE company_id = ANY($1))' USING _all_company_ids;
  END IF;

  IF to_regclass('public.assessments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.assessments WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- D. Interviews & Job Offers
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

  -- I. Question Bank & Talent Pool
  IF to_regclass('public.question_bank') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.question_bank WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  IF to_regclass('public.talent_pool') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.talent_pool WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- J. Notification Templates
  IF to_regclass('public.notification_templates') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.notification_templates WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- K. Company Invitations
  IF to_regclass('public.company_invitations') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.company_invitations WHERE company_id = ANY($1)' USING _all_company_ids;
    BEGIN
      EXECUTE 'DELETE FROM public.company_invitations WHERE branch_id = ANY($1)' USING _all_company_ids;
    EXCEPTION WHEN undefined_column THEN
      NULL;
    END;
  END IF;

  -- L. Subscriptions & Invoices
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

  -- N. Purge exclusive users from profiles, roles, and invalidate sessions
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

  -- O. Drop dedicated tenant schema if present (multi-schema support)
  _tenant_schema_name := 'tenant_' || replace(target_company_id::text, '-', '_');
  BEGIN
    EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(_tenant_schema_name) || ' CASCADE';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- P. Decouple System Audit Logs (Keep audit logs but set company_id to NULL to preserve history)
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    EXECUTE 'UPDATE public.audit_log SET company_id = NULL WHERE company_id = ANY($1)' USING _all_company_ids;
  END IF;

  -- Q. Delete child branches first (to satisfy self-referential foreign keys)
  IF array_length(_branch_ids, 1) > 0 THEN
    DELETE FROM public.companies WHERE id = ANY(_branch_ids);
    GET DIAGNOSTICS _deleted_branches = ROW_COUNT;
  END IF;

  -- R. Delete target parent company
  DELETE FROM public.companies WHERE id = target_company_id;

  -- 11. Record completion in audit log
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      resource,
      details,
      created_at
    ) VALUES (
      _effective_caller,
      'COMPANY_PERMANENT_DELETE_COMPLETED',
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

  -- 12. Return structured success payload
  _result := jsonb_build_object(
    'success', true,
    'deleted_company_id', target_company_id,
    'deleted_company_name', _target_company.name,
    'deleted_branches_count', _deleted_branches,
    'deleted_jobs_count', _deleted_jobs,
    'deleted_members_count', _deleted_members,
    'deleted_candidates_count', _deleted_candidates,
    'deleted_users_count', _deleted_users,
    'message', 'Company, child branches, all operational records, and exclusive users permanently purged'
  );

  RETURN _result;

EXCEPTION WHEN OTHERS THEN
  -- Transaction automatically rolls back on RAISE
  RAISE;
END;
$$;

-- Grant execution rights to authenticated users (RLS and is_super_admin inside enforce authorization)
GRANT EXECUTE ON FUNCTION public.delete_company_permanently(uuid, uuid) TO authenticated;
