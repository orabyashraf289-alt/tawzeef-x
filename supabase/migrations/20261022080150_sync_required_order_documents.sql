-- Each company chooses which uploaded documents are required for this order.
-- The applicant's parsed text is private application data, used only after
-- the evaluator confirms the recruiter belongs to the same company.
ALTER TABLE public.applications
  ADD COLUMN resume_text text CHECK (length(resume_text) <= 15000);

ALTER TABLE public.converted_orders
  ADD COLUMN required_document_kinds text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD CONSTRAINT converted_orders_required_document_kinds_check CHECK (
    required_document_kinds <@ ARRAY['id_copy','educational_cert','medical_report',
      'criminal_record','signed_contract','bank_iban','experience_certs']::text[]
  );

CREATE OR REPLACE FUNCTION public.review_order_onboarding_document(
  _document_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE reviewed_kind text; reviewed_order uuid;
BEGIN
  IF _decision NOT IN ('approved','rejected') OR length(coalesce(_note,'')) > 1000
     OR (_decision = 'rejected' AND nullif(trim(_note),'') IS NULL) THEN
    RAISE EXCEPTION 'Invalid review decision';
  END IF;
  UPDATE public.order_onboarding_documents d
  SET review_status = _decision, review_note = nullif(trim(_note),''),
      reviewed_by = auth.uid(), reviewed_at = now()
  FROM public.converted_orders o
  WHERE d.id = _document_id AND o.id = d.order_id
    AND public.can_manage_converted_order(o.company_id)
    AND o.status NOT IN ('draft','cancelled','completed')
    AND d.review_status = 'pending'
  RETURNING d.kind, d.order_id INTO reviewed_kind, reviewed_order;
  IF reviewed_order IS NULL THEN RETURN false; END IF;

  -- Keep the manual checklist aligned with the review of this uploaded file.
  UPDATE public.converted_orders
  SET documents_checklist = jsonb_set(documents_checklist, ARRAY[reviewed_kind],
    to_jsonb(_decision = 'approved'), true)
  WHERE id = reviewed_order;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.guard_required_order_documents()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.order_type = 'direct_hire' THEN
    IF NEW.onboarding_acknowledged_at IS NULL THEN
      RAISE EXCEPTION 'Candidate onboarding acknowledgement is required';
    END IF;
    IF EXISTS (
      SELECT 1 FROM unnest(NEW.required_document_kinds) AS required(kind)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.order_onboarding_documents d
        WHERE d.order_id = NEW.id AND d.kind = required.kind AND d.review_status = 'approved'
      )
    ) THEN
      RAISE EXCEPTION 'Required onboarding documents are awaiting approval';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_required_order_documents() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_required_order_documents_before_update
  BEFORE UPDATE OF status ON public.converted_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_required_order_documents();

-- Public token access receives required kind names and only latest review outcomes.
CREATE OR REPLACE FUNCTION public.get_order_onboarding(_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'order_number', o.order_number,
    'candidate_name', o.candidate_name,
    'job_title', o.job_title,
    'company_name', o.company_name,
    'target_branch', o.target_branch,
    'joining_date', o.joining_date,
    'total_salary', o.total_salary,
    'currency', o.currency,
    'status', o.status,
    'onboarding_acknowledged_at', o.onboarding_acknowledged_at,
    'required_document_kinds', o.required_document_kinds,
    'documents', coalesce((
      SELECT jsonb_agg(jsonb_build_object('kind', latest.kind,
        'file_name', latest.file_name, 'review_status', latest.review_status,
        'review_note', latest.review_note))
      FROM (SELECT DISTINCT ON (d.kind) d.kind, d.file_name, d.review_status, d.review_note
        FROM public.order_onboarding_documents d WHERE d.order_id = o.id
        ORDER BY d.kind, d.created_at DESC, d.id DESC) latest
    ), '[]'::jsonb)
  )
  FROM public.converted_orders o
  JOIN public.companies c ON c.id = o.company_id AND c.status = 'active'
  WHERE o.onboarding_token = _token AND o.order_type = 'direct_hire'
    AND o.candidate_id IS NOT NULL AND o.status NOT IN ('draft','cancelled')
    AND (c.parent_company_id IS NULL OR EXISTS (
      SELECT 1 FROM public.companies p WHERE p.id = c.parent_company_id AND p.status = 'active'));
$$;
