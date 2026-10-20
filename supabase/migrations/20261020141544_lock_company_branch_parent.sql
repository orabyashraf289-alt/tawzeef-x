-- A branch's parent defines inherited access and cascade behavior. Owners may
-- edit branch details, but must not reassign it to another tenant after insert.
CREATE OR REPLACE FUNCTION public.lock_company_branch_parent()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.parent_company_id IS DISTINCT FROM NEW.parent_company_id
     AND auth.uid() IS NOT NULL
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'company_parent_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lock_company_branch_parent() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER lock_company_branch_parent
  BEFORE UPDATE OF parent_company_id ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.lock_company_branch_parent();
