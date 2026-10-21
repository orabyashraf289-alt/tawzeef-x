-- Parent company owners review agency cases for active branches, with the
-- existing office and platform-admin access unchanged.
CREATE OR REPLACE FUNCTION public.can_view_agency_case(
  p_company_id uuid, p_agency_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.companies co
      WHERE co.id = p_company_id AND co.status = 'active'
        AND public.is_company_owner(co.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      JOIN public.agencies a ON a.id = am.agency_id AND a.status = 'active'
      JOIN public.agency_assignments aa ON aa.agency_id = am.agency_id
        AND aa.company_id = p_company_id
        AND aa.scope = 'company' AND aa.status = 'active'
      JOIN public.companies co ON co.id = aa.company_id AND co.status = 'active'
      WHERE am.agency_id = p_agency_id AND am.user_id = auth.uid()
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_agency_case(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_agency_case(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_agency_case(
  p_candidate_id uuid, p_decision text, p_note text DEFAULT NULL
) RETURNS public.agency_cases
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE rec public.agency_cases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO rec FROM public.agency_cases
  WHERE candidate_id = p_candidate_id FOR UPDATE;
  IF NOT FOUND OR rec.status <> 'awaiting_admin' OR rec.stage_index <> 7 THEN
    RAISE EXCEPTION 'Case is not awaiting review';
  END IF;
  IF NOT public.is_super_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM public.companies co
    WHERE co.id = rec.company_id AND co.status = 'active'
      AND public.is_company_owner(co.id)
  ) THEN RAISE EXCEPTION 'Company owner access required'; END IF;
  IF p_decision NOT IN ('accept', 'return') OR length(coalesce(p_note, '')) > 2000
    OR (p_decision = 'return' AND nullif(btrim(coalesce(p_note, '')), '') IS NULL)
  THEN RAISE EXCEPTION 'Invalid decision or note'; END IF;
  UPDATE public.agency_cases
  SET status = CASE p_decision WHEN 'accept' THEN 'file_accepted' ELSE 'needs_changes' END,
      reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
  WHERE candidate_id = p_candidate_id RETURNING * INTO rec;
  INSERT INTO public.agency_case_events(
    candidate_id, event_type, from_stage, to_stage, note, actor_user_id
  ) VALUES (
    p_candidate_id,
    CASE p_decision WHEN 'accept' THEN 'accepted' ELSE 'returned' END,
    7, 7, nullif(btrim(p_note), ''), auth.uid()
  );
  RETURN rec;
END;
$$;
REVOKE ALL ON FUNCTION public.review_agency_case(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_agency_case(uuid, text, text) TO authenticated;
