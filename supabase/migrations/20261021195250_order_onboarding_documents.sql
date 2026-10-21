-- Candidate uploads are kept in a private bucket. Only the company owner may
-- inspect submitted files and record a review decision.
CREATE TABLE public.order_onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.converted_orders(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('id_copy','educational_cert','medical_report',
    'criminal_record','signed_contract','bank_iban','experience_certs')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 180),
  content_type text NOT NULL CHECK (content_type IN ('application/pdf','image/jpeg','image/png')),
  file_size integer NOT NULL CHECK (file_size BETWEEN 1 AND 5242880),
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected')),
  review_note text CHECK (length(review_note) <= 1000),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_onboarding_documents_order_idx
  ON public.order_onboarding_documents(order_id, kind, created_at DESC);
CREATE UNIQUE INDEX order_onboarding_documents_open_kind_idx
  ON public.order_onboarding_documents(order_id, kind)
  WHERE review_status IN ('pending','approved');
ALTER TABLE public.order_onboarding_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owners read submitted order documents"
  ON public.order_onboarding_documents FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.converted_orders o WHERE o.id = order_id
      AND public.can_manage_converted_order(o.company_id))
  );
REVOKE ALL ON public.order_onboarding_documents FROM anon, authenticated;
GRANT SELECT ON public.order_onboarding_documents TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-onboarding-documents','order-onboarding-documents',false,5242880,
  ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Company owners read submitted order files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'order-onboarding-documents' AND EXISTS (
      SELECT 1 FROM public.order_onboarding_documents d
      JOIN public.converted_orders o ON o.id = d.order_id
      WHERE d.storage_path = storage.objects.name
        AND public.can_manage_converted_order(o.company_id)
    )
  );

-- This function changes only review fields, never employment status or checklist.
CREATE FUNCTION public.review_order_onboarding_document(
  _document_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF _decision NOT IN ('approved','rejected') OR length(coalesce(_note,'')) > 1000 THEN
    RAISE EXCEPTION 'Invalid review decision';
  END IF;
  UPDATE public.order_onboarding_documents d
  SET review_status = _decision, review_note = nullif(trim(_note),''),
      reviewed_by = auth.uid(), reviewed_at = now()
  FROM public.converted_orders o
  WHERE d.id = _document_id AND o.id = d.order_id
    AND public.can_manage_converted_order(o.company_id)
    AND o.status NOT IN ('draft','cancelled','completed')
    AND d.review_status = 'pending';
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.review_order_onboarding_document(uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_order_onboarding_document(uuid,text,text)
  TO authenticated;

-- The candidate receives only the latest document's name and review outcome.
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
REVOKE ALL ON FUNCTION public.get_order_onboarding(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_onboarding(uuid) TO anon, authenticated;
