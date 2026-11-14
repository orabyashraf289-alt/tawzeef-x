-- Phase 1: Manpower Planning & Job Requisitions (الاحتياج الوظيفي)
-- Strict tenant isolation via company_id, composite foreign keys, RLS using
-- active membership + has_hiring_permission / company admin checks, and
-- SECURITY DEFINER workflow RPCs.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ============================================================================
-- 1) TABLES & CONSTRAINTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  branch_name text,
  cost_center text,
  manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_departments_company_id_id_key UNIQUE (company_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS company_departments_company_name_branch_uidx
  ON public.company_departments (company_id, lower(name), COALESCE(lower(branch_name), ''));

CREATE INDEX IF NOT EXISTS company_departments_company_active_idx
  ON public.company_departments (company_id, is_active);

CREATE INDEX IF NOT EXISTS company_departments_manager_idx
  ON public.company_departments (manager_user_id)
  WHERE manager_user_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS public.job_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id uuid,
  branch_name text,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  employment_type text NOT NULL DEFAULT 'full_time' CHECK (length(btrim(employment_type)) > 0),
  headcount_requested integer NOT NULL CHECK (headcount_requested BETWEEN 1 AND 500),
  headcount_filled integer NOT NULL DEFAULT 0 CHECK (headcount_filled >= 0),
  budget_min numeric CHECK (budget_min IS NULL OR budget_min >= 0),
  budget_max numeric CHECK (budget_max IS NULL OR budget_max >= 0),
  currency text NOT NULL DEFAULT 'SAR' CHECK (length(btrim(currency)) > 0),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  target_start_date date,
  justification text,
  requirements text,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_approval', 'approved', 'rejected', 'converted', 'closed')
  ),
  requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  linked_job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_requisitions_company_id_id_key UNIQUE (company_id, id),
  CONSTRAINT job_requisitions_budget_range_check CHECK (
    budget_max IS NULL OR budget_min IS NULL OR budget_max >= budget_min
  ),
  CONSTRAINT job_requisitions_company_department_fkey
    FOREIGN KEY (company_id, department_id)
    REFERENCES public.company_departments(company_id, id)
    ON DELETE SET NULL (department_id),
  CONSTRAINT job_requisitions_company_job_fkey
    FOREIGN KEY (company_id, linked_job_id)
    REFERENCES public.jobs(company_id, id)
    ON DELETE SET NULL (linked_job_id)
);

CREATE INDEX IF NOT EXISTS job_requisitions_company_status_created_idx
  ON public.job_requisitions (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS job_requisitions_department_idx
  ON public.job_requisitions (department_id)
  WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS job_requisitions_requested_by_idx
  ON public.job_requisitions (requested_by);

CREATE INDEX IF NOT EXISTS job_requisitions_linked_job_idx
  ON public.job_requisitions (linked_job_id)
  WHERE linked_job_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS public.requisition_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requisition_id uuid NOT NULL,
  step_order integer NOT NULL DEFAULT 1 CHECK (step_order >= 1),
  approver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'approved', 'rejected')),
  notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT requisition_approvals_company_requisition_fkey
    FOREIGN KEY (company_id, requisition_id)
    REFERENCES public.job_requisitions(company_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS requisition_approvals_requisition_step_idx
  ON public.requisition_approvals (requisition_id, step_order, created_at);

CREATE INDEX IF NOT EXISTS requisition_approvals_company_approver_idx
  ON public.requisition_approvals (company_id, approver_user_id, decision);


-- ============================================================================
-- 2) INTERNAL TENANT & ADMIN AUTHORIZATION HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION hiring_private.is_active_company_tree(_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _company IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.companies c
    LEFT JOIN public.companies p ON p.id = c.parent_company_id
    WHERE c.id = _company
      AND c.status = 'active'
      AND (c.parent_company_id IS NULL OR p.status = 'active')
  );
$$;

REVOKE ALL ON FUNCTION hiring_private.is_active_company_tree(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hiring_private.is_active_company_tree(uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION hiring_private.is_active_company_member(_company uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _company IS NOT NULL
    AND _user IS NOT NULL
    AND hiring_private.is_active_company_tree(_company)
    AND COALESCE(public.get_user_role(_user)::text, 'recruiter') <> 'job_seeker'
    AND EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = _user
        AND u.deleted_at IS NULL
        AND (u.banned_until IS NULL OR u.banned_until <= now())
    )
    AND EXISTS (
      SELECT 1
      FROM public.company_members m
      JOIN public.companies c ON c.id = _company
      WHERE m.user_id = _user
        AND m.company_id IN (c.id, c.parent_company_id)
    );
$$;

REVOKE ALL ON FUNCTION hiring_private.is_active_company_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hiring_private.is_active_company_member(uuid, uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION hiring_private.is_company_admin(_company uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR _company IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = v_actor
      AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  ) THEN
    RETURN false;
  END IF;

  IF public.is_super_admin(v_actor) THEN
    RETURN true;
  END IF;

  IF NOT hiring_private.is_active_company_tree(_company) THEN
    RETURN false;
  END IF;

  IF COALESCE(public.get_user_role(v_actor)::text, 'recruiter') = 'job_seeker' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.company_members m
    JOIN public.companies c ON c.id = _company
    WHERE m.user_id = v_actor
      AND m.company_id IN (c.id, c.parent_company_id)
      AND m.member_role IN ('owner', 'admin')
  );
END;
$$;

REVOKE ALL ON FUNCTION hiring_private.is_company_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hiring_private.is_company_admin(uuid) TO authenticated, service_role;


-- ============================================================================
-- 3) INTEGRITY & WORKFLOW GUARD TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION hiring_private.guard_company_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_user IN ('authenticated', 'anon') THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Department identity and tenant cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION hiring_private.guard_company_department() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_company_departments ON public.company_departments;
CREATE TRIGGER trg_guard_company_departments
  BEFORE INSERT OR UPDATE ON public.company_departments
  FOR EACH ROW
  EXECUTE FUNCTION hiring_private.guard_company_department();


CREATE OR REPLACE FUNCTION hiring_private.guard_job_requisition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Direct client writes run as authenticated/anon; workflow RPCs are SECURITY DEFINER (postgres).
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'draft' THEN
        RAISE EXCEPTION 'New job requisitions must start in draft status' USING ERRCODE = '42501';
      END IF;
      IF NEW.approved_by IS NOT NULL
         OR NEW.approved_at IS NOT NULL
         OR NEW.rejection_reason IS NOT NULL
         OR NEW.linked_job_id IS NOT NULL THEN
        RAISE EXCEPTION 'Approval and job link fields cannot be set directly' USING ERRCODE = '42501';
      END IF;
      IF NEW.headcount_filled <> 0 THEN
        RAISE EXCEPTION 'Initial filled headcount must be 0' USING ERRCODE = '42501';
      END IF;
      IF NEW.requested_by IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'requested_by must match authenticated user' USING ERRCODE = '42501';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.company_id IS DISTINCT FROM OLD.company_id
         OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
         OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Requisition identity and tenant cannot be changed' USING ERRCODE = '42501';
      END IF;

      IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
         OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
         OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
         OR NEW.linked_job_id IS DISTINCT FROM OLD.linked_job_id THEN
        RAISE EXCEPTION 'Approval and conversion fields are managed by workflow RPCs' USING ERRCODE = '42501';
      END IF;

      IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT (
          NEW.status = 'closed'
          AND OLD.status IN ('draft', 'rejected', 'approved', 'converted')
        ) THEN
          RAISE EXCEPTION 'Use workflow RPCs to transition requisition status' USING ERRCODE = '42501';
        END IF;
      END IF;

      IF NEW.headcount_filled IS DISTINCT FROM OLD.headcount_filled
         AND OLD.status NOT IN ('approved', 'converted') THEN
        RAISE EXCEPTION 'Headcount filled can only be updated on approved or converted requisitions' USING ERRCODE = '42501';
      END IF;

      IF OLD.status NOT IN ('draft', 'rejected') THEN
        IF (NEW.department_id, NEW.branch_name, NEW.title, NEW.employment_type,
            NEW.headcount_requested, NEW.budget_min, NEW.budget_max, NEW.currency,
            NEW.priority, NEW.target_start_date, NEW.justification, NEW.requirements)
           IS DISTINCT FROM
           (OLD.department_id, OLD.branch_name, OLD.title, OLD.employment_type,
            OLD.headcount_requested, OLD.budget_min, OLD.budget_max, OLD.currency,
            OLD.priority, OLD.target_start_date, OLD.justification, OLD.requirements) THEN
          RAISE EXCEPTION 'Submitted or finalized requisitions cannot be edited' USING ERRCODE = '42501';
        END IF;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION hiring_private.guard_job_requisition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_job_requisitions ON public.job_requisitions;
CREATE TRIGGER trg_guard_job_requisitions
  BEFORE INSERT OR UPDATE ON public.job_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION hiring_private.guard_job_requisition();


CREATE OR REPLACE FUNCTION hiring_private.guard_requisition_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_req_status text;
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.decision IS DISTINCT FROM 'pending' OR NEW.decided_at IS NOT NULL THEN
        RAISE EXCEPTION 'Approval decisions must be recorded via decide_job_requisition' USING ERRCODE = '42501';
      END IF;

      SELECT r.status
        INTO v_req_status
      FROM public.job_requisitions r
      WHERE r.id = NEW.requisition_id
        AND r.company_id = NEW.company_id;

      IF NOT FOUND OR v_req_status NOT IN ('draft', 'rejected') THEN
        RAISE EXCEPTION 'Approvers can only be configured for draft or rejected requisitions' USING ERRCODE = '42501';
      END IF;

      IF NOT hiring_private.is_active_company_member(NEW.company_id, NEW.approver_user_id) THEN
        RAISE EXCEPTION 'Approver must be an active member of this company' USING ERRCODE = '42501';
      END IF;

      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.decision IS DISTINCT FROM 'pending' THEN
        RAISE EXCEPTION 'Decided approval records cannot be deleted' USING ERRCODE = '42501';
      END IF;

      SELECT r.status
        INTO v_req_status
      FROM public.job_requisitions r
      WHERE r.id = OLD.requisition_id
        AND r.company_id = OLD.company_id;

      -- Allow ON DELETE CASCADE when parent requisition is deleted; otherwise restrict to editable states.
      IF FOUND AND v_req_status NOT IN ('draft', 'rejected', 'closed') THEN
        RAISE EXCEPTION 'Cannot remove pending approval step after submission' USING ERRCODE = '42501';
      END IF;

      RETURN OLD;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION hiring_private.guard_requisition_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_requisition_approvals ON public.requisition_approvals;
CREATE TRIGGER trg_guard_requisition_approvals
  BEFORE INSERT OR DELETE ON public.requisition_approvals
  FOR EACH ROW
  EXECUTE FUNCTION hiring_private.guard_requisition_approval();


-- ============================================================================
-- 4) STRICT MULTI-TENANT ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.company_departments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_departments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_departments TO authenticated;
GRANT ALL ON public.company_departments TO service_role;

DROP POLICY IF EXISTS "company_departments_select" ON public.company_departments;
CREATE POLICY "company_departments_select"
  ON public.company_departments FOR SELECT TO authenticated
  USING (
    public.has_hiring_permission(company_id, 'jobs', 'read')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );

DROP POLICY IF EXISTS "company_departments_insert" ON public.company_departments;
CREATE POLICY "company_departments_insert"
  ON public.company_departments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_hiring_permission(company_id, 'jobs', 'create')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );

DROP POLICY IF EXISTS "company_departments_update" ON public.company_departments;
CREATE POLICY "company_departments_update"
  ON public.company_departments FOR UPDATE TO authenticated
  USING (
    public.has_hiring_permission(company_id, 'jobs', 'edit')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  )
  WITH CHECK (
    public.has_hiring_permission(company_id, 'jobs', 'edit')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );

DROP POLICY IF EXISTS "company_departments_delete" ON public.company_departments;
CREATE POLICY "company_departments_delete"
  ON public.company_departments FOR DELETE TO authenticated
  USING (
    public.has_hiring_permission(company_id, 'jobs', 'delete')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );


ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_requisitions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_requisitions TO authenticated;
GRANT ALL ON public.job_requisitions TO service_role;

DROP POLICY IF EXISTS "job_requisitions_select" ON public.job_requisitions;
CREATE POLICY "job_requisitions_select"
  ON public.job_requisitions FOR SELECT TO authenticated
  USING (
    public.has_hiring_permission(company_id, 'jobs', 'read')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );

DROP POLICY IF EXISTS "job_requisitions_insert" ON public.job_requisitions;
CREATE POLICY "job_requisitions_insert"
  ON public.job_requisitions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_hiring_permission(company_id, 'jobs', 'create')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
    AND requested_by = (SELECT auth.uid())
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "job_requisitions_update" ON public.job_requisitions;
CREATE POLICY "job_requisitions_update"
  ON public.job_requisitions FOR UPDATE TO authenticated
  USING (
    public.has_hiring_permission(company_id, 'jobs', 'edit')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  )
  WITH CHECK (
    public.has_hiring_permission(company_id, 'jobs', 'edit')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );

DROP POLICY IF EXISTS "job_requisitions_delete" ON public.job_requisitions;
CREATE POLICY "job_requisitions_delete"
  ON public.job_requisitions FOR DELETE TO authenticated
  USING (
    public.has_hiring_permission(company_id, 'jobs', 'delete')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );


ALTER TABLE public.requisition_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.requisition_approvals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.requisition_approvals TO authenticated;
GRANT ALL ON public.requisition_approvals TO service_role;

DROP POLICY IF EXISTS "requisition_approvals_select" ON public.requisition_approvals;
CREATE POLICY "requisition_approvals_select"
  ON public.requisition_approvals FOR SELECT TO authenticated
  USING (
    public.has_hiring_permission(company_id, 'jobs', 'read')
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR hiring_private.is_active_company_tree(company_id)
    )
  );

DROP POLICY IF EXISTS "requisition_approvals_insert" ON public.requisition_approvals;
CREATE POLICY "requisition_approvals_insert"
  ON public.requisition_approvals FOR INSERT TO authenticated
  WITH CHECK (
    hiring_private.is_company_admin(company_id)
    AND public.has_hiring_permission(company_id, 'jobs', 'create')
    AND decision = 'pending'
    AND decided_at IS NULL
  );

DROP POLICY IF EXISTS "requisition_approvals_delete" ON public.requisition_approvals;
CREATE POLICY "requisition_approvals_delete"
  ON public.requisition_approvals FOR DELETE TO authenticated
  USING (
    hiring_private.is_company_admin(company_id)
    AND public.has_hiring_permission(company_id, 'jobs', 'delete')
    AND decision = 'pending'
  );


-- ============================================================================
-- 5) SECURITY-DEFINER WORKFLOW RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_job_requisition(p_requisition_id uuid)
RETURNS public.job_requisitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_req public.job_requisitions%ROWTYPE;
  v_updated public.job_requisitions%ROWTYPE;
  v_is_super boolean := false;
BEGIN
  IF p_requisition_id IS NULL THEN
    RAISE EXCEPTION 'Requisition id is required' USING ERRCODE = '22023';
  END IF;

  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = v_actor
      AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'Active authenticated user required' USING ERRCODE = '42501';
  END IF;

  v_is_super := public.is_super_admin(v_actor);

  SELECT *
    INTO v_req
  FROM public.job_requisitions
  WHERE id = p_requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job requisition not found' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_super AND NOT hiring_private.is_active_company_tree(v_req.company_id) THEN
    RAISE EXCEPTION 'Active company required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.has_hiring_permission(v_req.company_id, 'jobs', 'edit')
    OR (
      v_req.requested_by = v_actor
      AND public.has_hiring_permission(v_req.company_id, 'jobs', 'create')
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied to submit job requisition' USING ERRCODE = '42501';
  END IF;

  IF v_req.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft or rejected requisitions can be submitted for approval' USING ERRCODE = '22023';
  END IF;

  IF length(btrim(v_req.title)) = 0
     OR v_req.headcount_requested NOT BETWEEN 1 AND 500
     OR (v_req.budget_max IS NOT NULL AND v_req.budget_min IS NOT NULL AND v_req.budget_max < v_req.budget_min) THEN
    RAISE EXCEPTION 'Requisition validation failed' USING ERRCODE = '23514';
  END IF;

  IF v_req.department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.company_departments d
    WHERE d.id = v_req.department_id
      AND d.company_id = v_req.company_id
  ) THEN
    RAISE EXCEPTION 'Department does not belong to this company' USING ERRCODE = '23503';
  END IF;

  -- On resubmission after rejection, reset existing approval steps to pending.
  IF v_req.status = 'rejected' THEN
    UPDATE public.requisition_approvals
    SET decision = 'pending',
        notes = NULL,
        decided_at = NULL
    WHERE requisition_id = v_req.id
      AND company_id = v_req.company_id;
  END IF;

  -- Ensure any configured pending approvers are still active members of the tenant.
  IF EXISTS (
    SELECT 1
    FROM public.requisition_approvals a
    WHERE a.requisition_id = v_req.id
      AND a.company_id = v_req.company_id
      AND a.decision = 'pending'
      AND NOT hiring_private.is_active_company_member(v_req.company_id, a.approver_user_id)
  ) THEN
    RAISE EXCEPTION 'Assigned approver is no longer an active company member' USING ERRCODE = '42501';
  END IF;

  UPDATE public.job_requisitions
  SET status = 'pending_approval',
      approved_by = NULL,
      approved_at = NULL,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = v_req.id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_job_requisition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_job_requisition(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.decide_job_requisition(
  p_requisition_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS public.job_requisitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_req public.job_requisitions%ROWTYPE;
  v_step public.requisition_approvals%ROWTYPE;
  v_updated public.job_requisitions%ROWTYPE;
  v_is_super boolean := false;
  v_clean_notes text := NULLIF(btrim(p_notes), '');
  v_next_step integer;
BEGIN
  IF p_requisition_id IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Valid requisition id and decision (approved or rejected) are required' USING ERRCODE = '22023';
  END IF;

  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = v_actor
      AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'Active authenticated user required' USING ERRCODE = '42501';
  END IF;

  v_is_super := public.is_super_admin(v_actor);

  IF NOT v_is_super AND COALESCE(public.get_user_role(v_actor)::text, 'recruiter') = 'job_seeker' THEN
    RAISE EXCEPTION 'Job seekers cannot decide job requisitions' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_req
  FROM public.job_requisitions
  WHERE id = p_requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job requisition not found' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_super AND NOT (
    hiring_private.is_active_company_member(v_req.company_id, v_actor)
    AND public.has_hiring_permission(v_req.company_id, 'jobs', 'read')
  ) THEN
    RAISE EXCEPTION 'Active company access required' USING ERRCODE = '42501';
  END IF;

  IF v_req.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'Requisition is not pending approval' USING ERRCODE = '22023';
  END IF;

  -- Check if there is an explicit pending step in the approval chain.
  SELECT *
    INTO v_step
  FROM public.requisition_approvals
  WHERE requisition_id = v_req.id
    AND company_id = v_req.company_id
    AND decision = 'pending'
  ORDER BY step_order ASC, created_at ASC, id ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_step.approver_user_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Only the assigned approver for the current step can decide this requisition' USING ERRCODE = '42501';
    END IF;

    UPDATE public.requisition_approvals
    SET decision = p_decision,
        notes = v_clean_notes,
        decided_at = now()
    WHERE id = v_step.id;
  ELSE
    -- Without explicit approval steps, only company admins (owner/admin) or super_admin may decide.
    IF NOT (
      hiring_private.is_company_admin(v_req.company_id)
      AND public.has_hiring_permission(v_req.company_id, 'jobs', 'read')
    ) THEN
      RAISE EXCEPTION 'Approver or company administrator permission required' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(MAX(step_order), 0) + 1
      INTO v_next_step
    FROM public.requisition_approvals
    WHERE requisition_id = v_req.id
      AND company_id = v_req.company_id;

    INSERT INTO public.requisition_approvals (
      company_id,
      requisition_id,
      step_order,
      approver_user_id,
      decision,
      notes,
      decided_at
    ) VALUES (
      v_req.company_id,
      v_req.id,
      v_next_step,
      v_actor,
      p_decision,
      v_clean_notes,
      now()
    );
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.job_requisitions
    SET status = 'rejected',
        approved_by = NULL,
        approved_at = NULL,
        rejection_reason = v_clean_notes,
        updated_at = now()
    WHERE id = v_req.id
    RETURNING * INTO v_updated;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM public.requisition_approvals
    WHERE requisition_id = v_req.id
      AND company_id = v_req.company_id
      AND decision = 'pending'
  ) THEN
    UPDATE public.job_requisitions
    SET status = 'approved',
        approved_by = v_actor,
        approved_at = now(),
        rejection_reason = NULL,
        updated_at = now()
    WHERE id = v_req.id
    RETURNING * INTO v_updated;
  ELSE
    UPDATE public.job_requisitions
    SET updated_at = now()
    WHERE id = v_req.id
    RETURNING * INTO v_updated;
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_job_requisition(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_job_requisition(uuid, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.convert_requisition_to_job(p_requisition_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_req public.job_requisitions%ROWTYPE;
  v_dept_name text;
  v_dept_branch text;
  v_company_city text;
  v_department text;
  v_location text;
  v_type text;
  v_requirements text[];
  v_salary_min integer;
  v_salary_max integer;
  v_job_id uuid;
  v_is_super boolean := false;
BEGIN
  IF p_requisition_id IS NULL THEN
    RAISE EXCEPTION 'Requisition id is required' USING ERRCODE = '22023';
  END IF;

  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = v_actor
      AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  ) THEN
    RAISE EXCEPTION 'Active authenticated user required' USING ERRCODE = '42501';
  END IF;

  v_is_super := public.is_super_admin(v_actor);

  SELECT *
    INTO v_req
  FROM public.job_requisitions
  WHERE id = p_requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job requisition not found' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_super AND NOT hiring_private.is_active_company_tree(v_req.company_id) THEN
    RAISE EXCEPTION 'Active company required' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_super AND NOT hiring_private.is_active_company_member(v_req.company_id, v_actor) THEN
    RAISE EXCEPTION 'Active company membership required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_hiring_permission(v_req.company_id, 'jobs', 'create') THEN
    RAISE EXCEPTION 'Permission denied to create jobs from requisitions' USING ERRCODE = '42501';
  END IF;

  IF v_req.status = 'converted' OR v_req.linked_job_id IS NOT NULL THEN
    RAISE EXCEPTION 'Job requisition has already been converted' USING ERRCODE = '22023';
  END IF;

  IF v_req.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved requisitions can be converted to jobs' USING ERRCODE = '22023';
  END IF;

  IF v_req.department_id IS NOT NULL THEN
    SELECT d.name, d.branch_name
      INTO v_dept_name, v_dept_branch
    FROM public.company_departments d
    WHERE d.id = v_req.department_id
      AND d.company_id = v_req.company_id;
  END IF;

  SELECT c.city
    INTO v_company_city
  FROM public.companies c
  WHERE c.id = v_req.company_id;

  v_department := COALESCE(NULLIF(btrim(v_dept_name), ''), 'عام');
  v_location := COALESCE(
    NULLIF(btrim(v_req.branch_name), ''),
    NULLIF(btrim(v_dept_branch), ''),
    NULLIF(btrim(v_company_city), ''),
    'غير محدد'
  );
  v_type := COALESCE(NULLIF(btrim(v_req.employment_type), ''), 'full_time');

  v_salary_min := CASE
    WHEN v_req.budget_min IS NOT NULL THEN round(v_req.budget_min)::integer
    ELSE NULL
  END;
  v_salary_max := CASE
    WHEN v_req.budget_max IS NOT NULL THEN round(v_req.budget_max)::integer
    ELSE NULL
  END;

  IF NULLIF(btrim(v_req.requirements), '') IS NOT NULL THEN
    SELECT NULLIF(
      ARRAY(
        SELECT btrim(line)
        FROM pg_catalog.regexp_split_to_table(v_req.requirements, E'\r?\n+') AS line
        WHERE btrim(line) <> ''
      ),
      ARRAY[]::text[]
    )
    INTO v_requirements;
  END IF;

  INSERT INTO public.jobs (
    user_id,
    company_id,
    title,
    department,
    location,
    type,
    status,
    salary_min,
    salary_max,
    description,
    requirements
  ) VALUES (
    v_actor,
    v_req.company_id,
    btrim(v_req.title),
    v_department,
    v_location,
    v_type,
    'نشطة',
    v_salary_min,
    v_salary_max,
    NULLIF(btrim(v_req.justification), ''),
    v_requirements
  )
  RETURNING id INTO v_job_id;

  UPDATE public.job_requisitions
  SET linked_job_id = v_job_id,
      status = 'converted',
      updated_at = now()
  WHERE id = v_req.id;

  RETURN v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_requisition_to_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_requisition_to_job(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
