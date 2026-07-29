-- Migration: Add branch_id to company_invitations and auto-assign branch manager on acceptance

ALTER TABLE public.company_invitations
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_company_invitations_branch_id ON public.company_invitations(branch_id);

-- Updated RPC to accept invitation and set branch manager if specified
CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED');
  END IF;

  SELECT * INTO v_inv
  FROM public.company_invitations
  WHERE token = _token AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND_OR_EXPIRED');
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.company_invitations SET status = 'expired' WHERE id = v_inv.id;
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EXPIRED');
  END IF;

  -- 1) Add to company_members
  INSERT INTO public.company_members (company_id, user_id, member_role)
  VALUES (v_inv.company_id, v_user_id, COALESCE(v_inv.member_role, 'hr'))
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET member_role = EXCLUDED.member_role;

  -- 2) If branch_id is specified, assign user as branch manager
  IF v_inv.branch_id IS NOT NULL THEN
    UPDATE public.companies
    SET manager_user_id = v_user_id,
        updated_at = now()
    WHERE id = v_inv.branch_id;

    -- Also add to branch company_members if different from parent
    INSERT INTO public.company_members (company_id, user_id, member_role)
    VALUES (v_inv.branch_id, v_user_id, 'hr')
    ON CONFLICT (company_id, user_id) DO NOTHING;
  END IF;

  -- 3) Mark invitation accepted
  UPDATE public.company_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object('success', true, 'company_id', v_inv.company_id, 'branch_id', v_inv.branch_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.accept_company_invitation(TEXT) TO authenticated;
