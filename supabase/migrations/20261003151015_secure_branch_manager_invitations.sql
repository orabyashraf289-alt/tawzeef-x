-- Reissue the branch manager changes without replacing the invitation's email check.
-- Existing notes metadata is intentionally left untouched.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_manager_user_id
  ON public.companies(manager_user_id);

CREATE POLICY "Assigned branch managers can view their branch"
  ON public.companies FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

ALTER TABLE public.company_invitations
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_company_invitations_branch_id
  ON public.company_invitations(branch_id);

-- A tenant's application admin role must not manage invitations from other tenants.
DROP POLICY IF EXISTS "Admins manage company invitations" ON public.company_invitations;
CREATE POLICY "Platform admins manage company invitations"
  ON public.company_invitations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv public.company_invitations%ROWTYPE;
  _uid uuid := auth.uid();
  _user_email text := auth.jwt() ->> 'email';
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO _inv
    FROM public.company_invitations
   WHERE token = _token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND');
  END IF;
  IF _inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_PENDING', 'status', _inv.status);
  END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.company_invitations SET status = 'expired' WHERE id = _inv.id;
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EXPIRED');
  END IF;
  IF nullif(btrim(_user_email), '') IS NULL OR lower(_inv.email) <> lower(_user_email) THEN
    RETURN jsonb_build_object('success', false, 'code', 'EMAIL_MISMATCH');
  END IF;
  IF _inv.member_role NOT IN ('owner', 'hr', 'viewer') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_ROLE');
  END IF;

  IF _inv.branch_id IS NOT NULL THEN
    -- Keep the parent relation stable until membership and manager assignment finish.
    PERFORM 1 FROM public.companies
     WHERE id = _inv.branch_id AND parent_company_id = _inv.company_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_BRANCH');
    END IF;
  END IF;

  INSERT INTO public.company_members (company_id, user_id, member_role, invited_by)
  VALUES (_inv.company_id, _uid, _inv.member_role, _inv.invited_by)
  ON CONFLICT (company_id, user_id) DO NOTHING;

  IF _inv.branch_id IS NOT NULL THEN
    INSERT INTO public.company_members (company_id, user_id, member_role, invited_by)
    VALUES (_inv.branch_id, _uid,
            CASE WHEN _inv.member_role = 'viewer' THEN 'viewer' ELSE 'hr' END,
            _inv.invited_by)
    ON CONFLICT (company_id, user_id) DO NOTHING;

    IF _inv.member_role <> 'viewer' THEN
      UPDATE public.companies SET manager_user_id = _uid, updated_at = now()
       WHERE id = _inv.branch_id AND parent_company_id = _inv.company_id;
    END IF;
  END IF;

  UPDATE public.company_invitations
     SET status = 'accepted', accepted_at = now()
   WHERE id = _inv.id;

  RETURN jsonb_build_object('success', true, 'company_id', _inv.company_id,
                            'branch_id', _inv.branch_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_company_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(text) TO authenticated;
