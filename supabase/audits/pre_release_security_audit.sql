-- Pre-release & post-migration read-only security audit for Tawzeef-X.
-- Strictly read-only (SELECT only). Returns aggregated counts and catalog
-- metadata only; no candidate names, emails, row IDs, or Auth secrets are returned.
-- Run separately from migrations (in psql or Supabase SQL Editor) after
-- applying the 20261105* (and 20261113*) migrations.

WITH
-- 1) Legacy candidate / job / application tenant-link review (legacy_candidate_links pattern)
membership_counts AS (
  SELECT user_id, count(DISTINCT company_id) AS companies
  FROM public.company_members
  GROUP BY user_id
),
jobs_review AS (
  SELECT
    count(*) FILTER (WHERE j.company_id IS NULL) AS missing_company,
    count(*) FILTER (WHERE j.company_id IS NULL AND m.companies = 1) AS single_current_membership,
    count(*) FILTER (WHERE j.company_id IS NULL AND m.companies > 1) AS ambiguous_memberships,
    count(*) FILTER (WHERE j.company_id IS NULL AND m.user_id IS NULL) AS no_membership
  FROM public.jobs j
  LEFT JOIN membership_counts m ON m.user_id = j.user_id
),
candidates_review AS (
  SELECT
    count(*) FILTER (WHERE c.company_id IS NULL) AS missing_company,
    count(*) FILTER (WHERE c.company_id IS NULL AND j.company_id IS NOT NULL) AS company_link_from_job,
    count(*) FILTER (WHERE c.user_id IS NULL) AS missing_user,
    count(*) FILTER (WHERE c.user_id IS NULL AND c.job_id IS NULL) AS missing_user_without_job,
    count(*) FILTER (WHERE c.user_id IS NULL AND c.company_id = j.company_id AND j.user_id IS NOT NULL) AS user_link_from_same_company_job,
    count(*) FILTER (WHERE c.company_id IS NOT NULL AND j.company_id IS NOT NULL AND c.company_id <> j.company_id) AS conflicting_company,
    count(*) FILTER (WHERE c.job_id IS NOT NULL AND j.id IS NULL) AS missing_job
  FROM public.candidates c
  LEFT JOIN public.jobs j ON j.id = c.job_id
),
applications_review AS (
  SELECT
    count(*) FILTER (WHERE a.company_id IS NULL) AS missing_company,
    count(*) FILTER (WHERE a.company_id IS NULL AND j.company_id IS NOT NULL) AS company_link_from_job,
    count(*) FILTER (WHERE a.company_id IS NOT NULL AND j.company_id IS NOT NULL AND a.company_id <> j.company_id) AS conflicting_company,
    count(*) FILTER (WHERE j.id IS NULL) AS missing_job
  FROM public.applications a
  LEFT JOIN public.jobs j ON j.id = a.job_id
),

-- 2) Platform roles single-source-of-truth & legacy admin verification
platform_role_counts AS (
  SELECT
    count(*) FILTER (WHERE pr.role = 'super_admin') AS super_admin_count,
    count(*) FILTER (WHERE pr.role = 'platform_support') AS platform_support_count,
    count(*) FILTER (WHERE pr.role = 'platform_auditor') AS platform_auditor_count,
    count(*) FILTER (
      WHERE u.id IS NULL
         OR u.deleted_at IS NOT NULL
         OR (u.banned_until IS NOT NULL AND u.banned_until > now())
    ) AS inactive_or_deleted_platform_users
  FROM public.platform_roles pr
  LEFT JOIN auth.users u ON u.id = pr.user_id
),
tenant_admin_separation AS (
  SELECT
    count(*) FILTER (WHERE ur.role::text = 'admin' AND pr.user_id IS NULL) AS tenant_only_admin_users,
    count(*) FILTER (WHERE ur.role::text = 'admin' AND pr.user_id IS NOT NULL) AS admin_users_also_in_platform_roles
  FROM public.user_roles ur
  LEFT JOIN public.platform_roles pr ON pr.user_id = ur.user_id
),
platform_security_catalog AS (
  SELECT
    COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.platform_roles')), false) AS platform_roles_rls_enabled,
    has_table_privilege('anon', 'public.platform_roles', 'SELECT') AS anon_can_select_platform_roles,
    (
      has_table_privilege('authenticated', 'public.platform_roles', 'INSERT')
      OR has_table_privilege('authenticated', 'public.platform_roles', 'UPDATE')
      OR has_table_privilege('authenticated', 'public.platform_roles', 'DELETE')
    ) AS authenticated_can_mutate_platform_roles,
    CASE
      WHEN to_regprocedure('public.is_super_admin(uuid)') IS NULL THEN true
      ELSE pg_get_functiondef(to_regprocedure('public.is_super_admin(uuid)'))
        ~* '(user_metadata|tx@tawzeefx\.com|ctraining801@gmail\.com|user_roles|app_role)'
    END AS is_super_admin_uses_legacy_source,
    CASE
      WHEN to_regprocedure('public.is_super_admin_user()') IS NULL THEN true
      ELSE pg_get_functiondef(to_regprocedure('public.is_super_admin_user()'))
        ~* '(user_metadata|tx@tawzeefx\.com|ctraining801@gmail\.com|user_roles|app_role)'
    END AS is_super_admin_user_uses_legacy_source,
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('is_super_admin', 'is_super_admin_user', 'get_platform_role', 'delete_company_permanently')
        AND p.prosecdef = true
        AND NOT EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
          WHERE cfg LIKE 'search_path=%'
        )
    ) AS security_definer_missing_search_path,
    CASE
      WHEN to_regprocedure('public.delete_company_permanently(uuid,uuid)') IS NULL THEN false
      ELSE (
        has_function_privilege('authenticated', 'public.delete_company_permanently(uuid,uuid)', 'EXECUTE')
        OR has_function_privilege('anon', 'public.delete_company_permanently(uuid,uuid)', 'EXECUTE')
      )
    END AS client_can_execute_delete_company_permanently
),

-- 3) Legacy RLS policies & public candidate/application leaks
legacy_rls_audit AS (
  SELECT
    count(*) FILTER (
      WHERE schemaname = 'public'
        AND tablename IN ('candidates', 'applications', 'candidate_scorecards')
        AND cmd = 'SELECT'
        AND roles && ARRAY['anon'::name, 'public'::name]
    ) AS public_candidate_or_application_select_policies,
    count(*) FILTER (
      WHERE schemaname = 'public'
        AND tablename IN ('candidates', 'applications', 'candidate_scorecards')
        AND (
          regexp_replace(COALESCE(qual, ''), '[ ()]', '', 'g') = 'true'
          OR regexp_replace(COALESCE(with_check, ''), '[ ()]', '', 'g') = 'true'
        )
    ) AS unscoped_true_candidate_policies,
    count(*) FILTER (
      WHERE schemaname = 'public'
        AND (
          COALESCE(qual, '') ~* 'has_role\s*\([^)]*''admin'''
          OR COALESCE(with_check, '') ~* 'has_role\s*\([^)]*''admin'''
        )
    ) AS legacy_has_role_admin_policies,
    count(*) FILTER (
      WHERE schemaname = 'public'
        AND (
          COALESCE(qual, '') ~* '(user_metadata|tx@tawzeefx\.com|ctraining801@gmail\.com)'
          OR COALESCE(with_check, '') ~* '(user_metadata|tx@tawzeefx\.com|ctraining801@gmail\.com)'
        )
    ) AS user_metadata_or_hardcoded_email_policies,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('table', tablename, 'policy', policyname, 'cmd', cmd)
        ORDER BY tablename, policyname
      ) FILTER (
        WHERE schemaname = 'public'
          AND (
            COALESCE(qual, '') ~* 'has_role\s*\([^)]*''admin'''
            OR COALESCE(with_check, '') ~* 'has_role\s*\([^)]*''admin'''
            OR COALESCE(qual, '') ~* '(user_metadata|tx@tawzeefx\.com|ctraining801@gmail\.com)'
            OR COALESCE(with_check, '') ~* '(user_metadata|tx@tawzeefx\.com|ctraining801@gmail\.com)'
          )
      ),
      '[]'::jsonb
    ) AS flagged_policies
  FROM pg_policies
),

-- 4) Orphaned company memberships, inactive companies, branches & registry consistency
membership_health AS (
  SELECT
    count(*) AS total_memberships,
    count(*) FILTER (WHERE c.id IS NULL) AS memberships_without_company,
    count(*) FILTER (WHERE c.id IS NOT NULL AND c.status <> 'active') AS memberships_without_active_company,
    count(*) FILTER (WHERE c.status IN ('inactive', 'suspended')) AS memberships_in_inactive_or_suspended_company,
    count(*) FILTER (WHERE c.status IN ('deleting', 'delete_failed', 'deleted')) AS memberships_in_deleting_or_deleted_company,
    count(*) FILTER (
      WHERE u.id IS NULL
         OR u.deleted_at IS NOT NULL
         OR (u.banned_until IS NOT NULL AND u.banned_until > now())
    ) AS memberships_with_missing_or_inactive_auth_user
  FROM public.company_members cm
  LEFT JOIN public.companies c ON c.id = cm.company_id
  LEFT JOIN auth.users u ON u.id = cm.user_id
),
company_hierarchy_health AS (
  SELECT
    count(*) FILTER (WHERE c.parent_company_id IS NULL AND c.status = 'active') AS active_root_companies,
    count(*) FILTER (WHERE c.parent_company_id IS NULL AND c.status <> 'active') AS non_active_root_companies,
    count(*) FILTER (
      WHERE c.parent_company_id IS NOT NULL
        AND c.status = 'active'
        AND (p.id IS NULL OR p.status <> 'active')
    ) AS active_branches_without_active_parent,
    count(*) FILTER (
      WHERE c.parent_company_id IS NULL
        AND r.company_id IS NULL
    ) AS root_companies_missing_registry,
    (
      SELECT count(*)
      FROM public.tenant_database_registry tdr
      WHERE tdr.provisioning_state = 'ready'
        AND (tdr.isolation_mode <> 'dedicated' OR nullif(btrim(tdr.database_ref), '') IS NULL)
    ) AS invalid_ready_registry_entries
  FROM public.companies c
  LEFT JOIN public.companies p ON p.id = c.parent_company_id
  LEFT JOIN public.tenant_database_registry r ON r.company_id = c.id
),

-- 5) Assessment attempts sanity counts (hiring_private.assessment_attempts)
assessment_attempts_health AS (
  SELECT
    count(*) AS total_attempts,
    count(*) FILTER (WHERE ar.status = 'in_progress') AS in_progress_attempts,
    count(*) FILTER (WHERE ar.status = 'pending_review') AS pending_review_attempts,
    count(*) FILTER (WHERE ar.status = 'completed') AS completed_attempts,
    count(*) FILTER (WHERE ar.status = 'in_progress' AND aa.expires_at < now()) AS expired_still_in_progress,
    count(*) FILTER (WHERE aa.timed_out) AS timed_out_attempts,
    count(*) FILTER (WHERE aa.grade_claim IS NOT NULL AND aa.grade_claim_until < now()) AS stale_grade_claims,
    count(*) FILTER (WHERE ar.status = 'pending_review' AND aa.grade_attempts >= 5) AS max_grade_attempts_reached,
    count(*) FILTER (WHERE ar.id IS NULL OR a.id IS NULL OR cand.id IS NULL) AS missing_linked_records,
    count(*) FILTER (
      WHERE (a.id IS NOT NULL AND aa.company_id <> a.company_id)
         OR (cand.id IS NOT NULL AND aa.company_id <> cand.company_id)
    ) AS company_mismatch_count
  FROM hiring_private.assessment_attempts aa
  LEFT JOIN public.assessment_responses ar ON ar.id = aa.response_id
  LEFT JOIN public.assessments a ON a.id = aa.assessment_id
  LEFT JOIN public.candidates cand ON cand.id = aa.candidate_id
),

-- 6) Booking slots sanity counts (hiring_private.booking_slots)
booking_slots_health AS (
  SELECT
    count(*) AS total_slots,
    count(*) FILTER (WHERE NOT bs.withdrawn AND bs.interview_id IS NULL AND bs.starts_at > now()) AS available_future_slots,
    count(*) FILTER (WHERE bs.interview_id IS NOT NULL) AS booked_slots,
    count(*) FILTER (WHERE bs.withdrawn) AS withdrawn_slots,
    count(*) FILTER (
      WHERE bs.interview_id IS NOT NULL
        AND (i.id IS NULL OR i.status IN ('ملغاة', 'ملغية', 'cancelled', 'canceled'))
    ) AS booked_slots_missing_or_cancelled_interview,
    count(*) FILTER (WHERE i.id IS NOT NULL AND bs.company_id <> i.company_id) AS company_mismatch_count,
    count(*) FILTER (
      WHERE NOT bs.withdrawn
        AND bs.interview_id IS NULL
        AND bs.starts_at > now()
        AND (
          cm.id IS NULL
          OR u.id IS NULL
          OR u.deleted_at IS NOT NULL
          OR (u.banned_until IS NOT NULL AND u.banned_until > now())
        )
    ) AS inactive_interviewer_open_slots
  FROM hiring_private.booking_slots bs
  LEFT JOIN public.interviews i ON i.id = bs.interview_id
  LEFT JOIN public.company_members cm
    ON cm.company_id = bs.company_id AND cm.user_id = bs.interviewer_id
  LEFT JOIN auth.users u ON u.id = bs.interviewer_id
),

-- 7) RLS coverage across public & hiring_private tables
rls_coverage AS (
  SELECT
    count(*) FILTER (WHERE NOT c.relrowsecurity) AS tables_without_rls_count,
    COALESCE(
      jsonb_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname)
      FILTER (WHERE NOT c.relrowsecurity),
      '[]'::jsonb
    ) AS tables_without_rls,
    to_regclass('public.company_retention_policies') IS NOT NULL AS retention_policies_table_present
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'hiring_private')
    AND c.relkind IN ('r', 'p')
)

SELECT
  'legacy_candidate_links'::text AS audit_section,
  CASE
    WHEN c.conflicting_company > 0
      OR c.missing_job > 0
      OR a.conflicting_company > 0
      OR a.missing_company > 0
      OR a.missing_job > 0 THEN 'FAIL'
    WHEN c.missing_company > 0
      OR c.missing_user_without_job > 0
      OR j.missing_company > 0 THEN 'WARN'
    ELSE 'PASS'
  END AS status,
  jsonb_build_object(
    'jobs', to_jsonb(j),
    'candidates', to_jsonb(c),
    'applications', to_jsonb(a)
  ) AS details
FROM jobs_review j, candidates_review c, applications_review a

UNION ALL

SELECT
  'platform_roles_and_admin_checks'::text AS audit_section,
  CASE
    WHEN NOT psc.platform_roles_rls_enabled
      OR psc.anon_can_select_platform_roles
      OR psc.authenticated_can_mutate_platform_roles
      OR prc.super_admin_count = 0
      OR psc.is_super_admin_uses_legacy_source
      OR psc.is_super_admin_user_uses_legacy_source
      OR psc.security_definer_missing_search_path
      OR psc.client_can_execute_delete_company_permanently THEN 'FAIL'
    WHEN prc.inactive_or_deleted_platform_users > 0 THEN 'WARN'
    ELSE 'PASS'
  END AS status,
  to_jsonb(prc) || to_jsonb(tas) || to_jsonb(psc) AS details
FROM platform_role_counts prc, tenant_admin_separation tas, platform_security_catalog psc

UNION ALL

SELECT
  'legacy_rls_admin_policies'::text AS audit_section,
  CASE
    WHEN lra.public_candidate_or_application_select_policies > 0
      OR lra.unscoped_true_candidate_policies > 0
      OR lra.legacy_has_role_admin_policies > 0
      OR lra.user_metadata_or_hardcoded_email_policies > 0 THEN 'FAIL'
    ELSE 'PASS'
  END AS status,
  to_jsonb(lra) AS details
FROM legacy_rls_audit lra

UNION ALL

SELECT
  'orphaned_memberships_and_tenants'::text AS audit_section,
  CASE
    WHEN mh.memberships_without_company > 0
      OR chh.active_branches_without_active_parent > 0
      OR chh.invalid_ready_registry_entries > 0 THEN 'FAIL'
    WHEN mh.memberships_without_active_company > 0
      OR mh.memberships_with_missing_or_inactive_auth_user > 0
      OR chh.root_companies_missing_registry > 0 THEN 'WARN'
    ELSE 'PASS'
  END AS status,
  to_jsonb(mh) || to_jsonb(chh) AS details
FROM membership_health mh, company_hierarchy_health chh

UNION ALL

SELECT
  'assessment_attempts_sanity'::text AS audit_section,
  CASE
    WHEN aah.company_mismatch_count > 0
      OR aah.missing_linked_records > 0 THEN 'FAIL'
    WHEN aah.expired_still_in_progress > 0
      OR aah.stale_grade_claims > 0
      OR aah.max_grade_attempts_reached > 0 THEN 'WARN'
    ELSE 'PASS'
  END AS status,
  to_jsonb(aah) AS details
FROM assessment_attempts_health aah

UNION ALL

SELECT
  'booking_slots_sanity'::text AS audit_section,
  CASE
    WHEN bsh.company_mismatch_count > 0 THEN 'FAIL'
    WHEN bsh.booked_slots_missing_or_cancelled_interview > 0
      OR bsh.inactive_interviewer_open_slots > 0 THEN 'WARN'
    ELSE 'PASS'
  END AS status,
  to_jsonb(bsh) AS details
FROM booking_slots_health bsh

UNION ALL

SELECT
  'rls_coverage_audit'::text AS audit_section,
  CASE
    WHEN rc.tables_without_rls_count > 0 THEN 'FAIL'
    ELSE 'PASS'
  END AS status,
  to_jsonb(rc) AS details
FROM rls_coverage rc;
