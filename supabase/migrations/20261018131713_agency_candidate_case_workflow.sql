-- A separate, auditable agency process. Company offers and contracts retain
-- their existing approval rules; accepting this file never approves either.
CREATE TABLE public.agency_cases (
  candidate_id uuid PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stage_index smallint NOT NULL DEFAULT 0 CHECK (stage_index BETWEEN 0 AND 7),
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'awaiting_admin', 'needs_changes', 'file_accepted')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);
CREATE INDEX agency_cases_company_status_idx ON public.agency_cases(company_id, status);
CREATE INDEX agency_cases_agency_idx ON public.agency_cases(agency_id, updated_at DESC);
ALTER TABLE public.agency_cases ENABLE ROW LEVEL SECURITY;

-- Explicit case access is reused by every table and Storage policy. A company
-- employee without owner authority and an unrelated office see no case data.
CREATE FUNCTION public.can_view_agency_case(p_company_id uuid, p_agency_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      JOIN public.companies co ON co.id = cm.company_id AND co.status = 'active'
      WHERE cm.user_id = auth.uid() AND cm.company_id = p_company_id AND cm.member_role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.agency_members am
      JOIN public.agencies a ON a.id = am.agency_id AND a.status = 'active'
      JOIN public.agency_assignments aa ON aa.agency_id = am.agency_id
        AND aa.company_id = p_company_id AND aa.scope = 'company' AND aa.status = 'active'
      JOIN public.companies co ON co.id = aa.company_id AND co.status = 'active'
      WHERE am.agency_id = p_agency_id AND am.user_id = auth.uid()
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_agency_case(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_agency_case(uuid,uuid) TO authenticated;

CREATE POLICY "Assigned agency and company read case" ON public.agency_cases
  FOR SELECT TO authenticated USING (public.can_view_agency_case(company_id, agency_id));
REVOKE ALL ON public.agency_cases FROM anon, authenticated;
GRANT SELECT ON public.agency_cases TO authenticated;

CREATE TABLE public.agency_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.agency_cases(candidate_id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'stage', 'returned', 'resubmitted', 'accepted')),
  from_stage smallint,
  to_stage smallint,
  note text,
  actor_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agency_case_events_candidate_idx ON public.agency_case_events(candidate_id, created_at);
ALTER TABLE public.agency_case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Case viewers read history" ON public.agency_case_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.agency_cases ac WHERE ac.candidate_id = agency_case_events.candidate_id
      AND public.can_view_agency_case(ac.company_id, ac.agency_id))
  );
REVOKE ALL ON public.agency_case_events FROM anon, authenticated;
GRANT SELECT ON public.agency_case_events TO authenticated;

CREATE TABLE public.agency_case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.agency_cases(candidate_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cv', 'passport', 'analysis', 'medical', 'visa', 'other')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agency_case_documents_candidate_idx ON public.agency_case_documents(candidate_id, kind);
ALTER TABLE public.agency_case_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Case viewers read documents" ON public.agency_case_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.agency_cases ac WHERE ac.candidate_id = agency_case_documents.candidate_id
      AND public.can_view_agency_case(ac.company_id, ac.agency_id))
  );
REVOKE ALL ON public.agency_case_documents FROM anon, authenticated;
GRANT SELECT ON public.agency_case_documents TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('agency-documents', 'agency-documents', false, 10485760,
        ARRAY['application/pdf', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- The agency and case IDs are the first two path segments. Upload is possible
-- only for an active assigned office and an open/returned case.
CREATE POLICY "Assigned agency uploads case documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'agency-documents' AND EXISTS (
      SELECT 1 FROM public.agency_cases ac
      JOIN public.agency_members am ON am.agency_id = ac.agency_id AND am.user_id = (select auth.uid())
      WHERE ac.agency_id::text = (storage.foldername(name))[1]
        AND ac.candidate_id::text = (storage.foldername(name))[2]
        AND ac.status IN ('in_progress', 'needs_changes')
    )
  );
CREATE POLICY "Case viewers read registered documents" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'agency-documents' AND EXISTS (
      SELECT 1 FROM public.agency_case_documents d
      JOIN public.agency_cases ac ON ac.candidate_id = d.candidate_id
      WHERE d.storage_path = storage.objects.name
        AND public.can_view_agency_case(ac.company_id, ac.agency_id)
    )
  );
CREATE POLICY "Agency removes unregistered upload" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'agency-documents' AND owner_id = (select auth.uid())::text
    AND NOT EXISTS (SELECT 1 FROM public.agency_case_documents d WHERE d.storage_path = storage.objects.name)
  );

-- Legacy CV uploads use the resumes bucket. Allow any member of the same
-- currently assigned agency to open the exact CV referenced by its candidate.
CREATE POLICY "Assigned agency reads candidate CV" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'resumes' AND EXISTS (
      SELECT 1 FROM public.candidates c
      JOIN public.agency_cases ac ON ac.candidate_id = c.id
      WHERE c.resume_url = storage.objects.name
        AND public.can_view_agency_case(ac.company_id, ac.agency_id)
    )
  );

-- New submissions receive a case in the same transaction as the candidate.
CREATE FUNCTION public.create_agency_case_for_candidate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND
    (OLD.agency_id IS DISTINCT FROM NEW.agency_id OR OLD.company_id IS DISTINCT FROM NEW.company_id)
    AND EXISTS (SELECT 1 FROM public.agency_cases WHERE candidate_id = NEW.id)
  THEN
    RAISE EXCEPTION 'Agency case must be transferred through a reviewed process';
  END IF;
  IF NEW.agency_id IS NOT NULL AND NEW.company_id IS NOT NULL THEN
    INSERT INTO public.agency_cases(candidate_id, agency_id, company_id)
    VALUES (NEW.id, NEW.agency_id, NEW.company_id) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      INSERT INTO public.agency_case_events(candidate_id, event_type, to_stage)
      VALUES (NEW.id, 'created', 0);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_agency_case_for_candidate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_agency_case_after_candidate
  AFTER INSERT OR UPDATE OF agency_id, company_id ON public.candidates FOR EACH ROW
  EXECUTE FUNCTION public.create_agency_case_for_candidate();

-- Existing agency candidates start with a reviewable, unconfirmed first stage.
INSERT INTO public.agency_cases(candidate_id, agency_id, company_id)
SELECT id, agency_id, company_id FROM public.candidates
WHERE agency_id IS NOT NULL AND company_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO public.agency_case_events(candidate_id, event_type, to_stage, note)
SELECT ac.candidate_id, 'created', 0, 'ملف مكتب قائم أضيف إلى مسار المتابعة'
FROM public.agency_cases ac WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_case_events e WHERE e.candidate_id = ac.candidate_id
);

CREATE FUNCTION public.advance_agency_case(p_candidate_id uuid, p_next_stage smallint, p_note text DEFAULT NULL)
RETURNS public.agency_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE rec public.agency_cases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO rec FROM public.agency_cases WHERE candidate_id = p_candidate_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id AND a.status = 'active'
    JOIN public.agency_assignments aa ON aa.agency_id = am.agency_id
      AND aa.company_id = rec.company_id AND aa.scope = 'company' AND aa.status = 'active'
    JOIN public.companies co ON co.id = aa.company_id AND co.status = 'active'
    WHERE am.user_id = auth.uid() AND am.agency_id = rec.agency_id
  ) THEN RAISE EXCEPTION 'Agency access denied'; END IF;
  IF rec.status <> 'in_progress' OR p_next_stage IS DISTINCT FROM rec.stage_index + 1 THEN
    RAISE EXCEPTION 'Invalid stage transition';
  END IF;
  IF p_next_stage IN (3, 4, 5, 7) AND NOT EXISTS (
    SELECT 1 FROM public.agency_case_documents d WHERE d.candidate_id = p_candidate_id
      AND d.kind = CASE p_next_stage WHEN 3 THEN 'passport' WHEN 4 THEN 'analysis'
                   WHEN 5 THEN 'medical' WHEN 7 THEN 'visa' END
  ) THEN RAISE EXCEPTION 'Required document missing'; END IF;
  IF length(coalesce(p_note, '')) > 2000 THEN RAISE EXCEPTION 'Note too long'; END IF;

  UPDATE public.agency_cases SET stage_index = p_next_stage,
    status = CASE WHEN p_next_stage = 7 THEN 'awaiting_admin' ELSE 'in_progress' END,
    updated_at = now() WHERE candidate_id = p_candidate_id RETURNING * INTO rec;
  INSERT INTO public.agency_case_events(candidate_id, event_type, from_stage, to_stage, note, actor_user_id)
  VALUES (p_candidate_id, 'stage', p_next_stage - 1, p_next_stage, nullif(btrim(p_note), ''), auth.uid());
  RETURN rec;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_agency_case(uuid, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_agency_case(uuid, smallint, text) TO authenticated;

CREATE FUNCTION public.register_agency_case_document(
  p_candidate_id uuid, p_kind text, p_storage_path text, p_file_name text
) RETURNS public.agency_case_documents LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, storage AS $$
DECLARE rec public.agency_cases%ROWTYPE; doc public.agency_case_documents%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO rec FROM public.agency_cases WHERE candidate_id = p_candidate_id;
  IF NOT FOUND OR rec.status NOT IN ('in_progress', 'needs_changes') OR NOT EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id AND a.status = 'active'
    JOIN public.agency_assignments aa ON aa.agency_id = am.agency_id
      AND aa.company_id = rec.company_id AND aa.scope = 'company' AND aa.status = 'active'
    JOIN public.companies co ON co.id = aa.company_id AND co.status = 'active'
    WHERE am.user_id = auth.uid() AND am.agency_id = rec.agency_id
  ) THEN RAISE EXCEPTION 'Agency access denied'; END IF;
  IF p_kind NOT IN ('cv','passport','analysis','medical','visa','other')
    OR length(coalesce(p_file_name,'')) NOT BETWEEN 1 AND 200
    OR p_storage_path !~ ('^' || rec.agency_id::text || '/' || p_candidate_id::text || '/[a-z0-9-]+[.](pdf|doc|docx|jpg|jpeg|png)$')
    OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'agency-documents'
      AND o.name = p_storage_path AND o.owner_id = auth.uid()::text)
  THEN RAISE EXCEPTION 'Invalid document'; END IF;
  INSERT INTO public.agency_case_documents(candidate_id, kind, storage_path, file_name, uploaded_by)
  VALUES (p_candidate_id, p_kind, p_storage_path, p_file_name, auth.uid()) RETURNING * INTO doc;
  RETURN doc;
END;
$$;
REVOKE ALL ON FUNCTION public.register_agency_case_document(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_agency_case_document(uuid,text,text,text) TO authenticated;

CREATE FUNCTION public.resubmit_agency_case(p_candidate_id uuid, p_note text DEFAULT NULL)
RETURNS public.agency_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE rec public.agency_cases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO rec FROM public.agency_cases WHERE candidate_id = p_candidate_id FOR UPDATE;
  IF NOT FOUND OR rec.status <> 'needs_changes' OR rec.stage_index <> 7 OR NOT EXISTS (
    SELECT 1 FROM public.agency_members am
    JOIN public.agencies a ON a.id = am.agency_id AND a.status = 'active'
    JOIN public.agency_assignments aa ON aa.agency_id = am.agency_id
      AND aa.company_id = rec.company_id AND aa.scope = 'company' AND aa.status = 'active'
    JOIN public.companies co ON co.id = aa.company_id AND co.status = 'active'
    WHERE am.user_id = auth.uid() AND am.agency_id = rec.agency_id
  ) THEN RAISE EXCEPTION 'Agency access denied'; END IF;
  IF length(coalesce(p_note,'')) > 2000 THEN RAISE EXCEPTION 'Note too long'; END IF;
  UPDATE public.agency_cases SET status = 'awaiting_admin', updated_at = now()
  WHERE candidate_id = p_candidate_id RETURNING * INTO rec;
  INSERT INTO public.agency_case_events(candidate_id, event_type, from_stage, to_stage, note, actor_user_id)
  VALUES (p_candidate_id, 'resubmitted', 7, 7, nullif(btrim(p_note),''), auth.uid());
  RETURN rec;
END;
$$;
REVOKE ALL ON FUNCTION public.resubmit_agency_case(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_agency_case(uuid,text) TO authenticated;

CREATE FUNCTION public.review_agency_case(p_candidate_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS public.agency_cases LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE rec public.agency_cases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO rec FROM public.agency_cases WHERE candidate_id = p_candidate_id FOR UPDATE;
  IF NOT FOUND OR rec.status <> 'awaiting_admin' OR rec.stage_index <> 7 THEN
    RAISE EXCEPTION 'Case is not awaiting review';
  END IF;
  IF NOT public.is_super_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    JOIN public.companies co ON co.id = cm.company_id AND co.status = 'active'
    WHERE cm.user_id = auth.uid() AND cm.company_id = rec.company_id AND cm.member_role = 'owner'
  ) THEN RAISE EXCEPTION 'Company owner access required'; END IF;
  IF p_decision NOT IN ('accept','return') OR length(coalesce(p_note,'')) > 2000
    OR (p_decision = 'return' AND nullif(btrim(coalesce(p_note,'')), '') IS NULL)
  THEN RAISE EXCEPTION 'Invalid decision or note'; END IF;
  UPDATE public.agency_cases SET status = CASE p_decision WHEN 'accept' THEN 'file_accepted' ELSE 'needs_changes' END,
    reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
  WHERE candidate_id = p_candidate_id RETURNING * INTO rec;
  INSERT INTO public.agency_case_events(candidate_id, event_type, from_stage, to_stage, note, actor_user_id)
  VALUES (p_candidate_id, CASE p_decision WHEN 'accept' THEN 'accepted' ELSE 'returned' END,
    7, 7, nullif(btrim(p_note),''), auth.uid());
  RETURN rec;
END;
$$;
REVOKE ALL ON FUNCTION public.review_agency_case(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_agency_case(uuid,text,text) TO authenticated;
