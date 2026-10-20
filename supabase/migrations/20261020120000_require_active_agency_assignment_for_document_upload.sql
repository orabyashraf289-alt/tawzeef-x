-- Match the Storage upload gate to the case registration RPC. A former office
-- member must not keep uploading files after its company assignment is revoked.
DROP POLICY IF EXISTS "Assigned agency uploads case documents" ON storage.objects;

CREATE POLICY "Assigned agency uploads case documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'agency-documents' AND EXISTS (
      SELECT 1 FROM public.agency_cases ac
      JOIN public.agency_members am ON am.agency_id = ac.agency_id
        AND am.user_id = (select auth.uid())
      JOIN public.agencies a ON a.id = ac.agency_id AND a.status = 'active'
      JOIN public.agency_assignments aa ON aa.agency_id = ac.agency_id
        AND aa.company_id = ac.company_id AND aa.scope = 'company' AND aa.status = 'active'
      JOIN public.companies co ON co.id = ac.company_id AND co.status = 'active'
      WHERE ac.agency_id::text = (storage.foldername(name))[1]
        AND ac.candidate_id::text = (storage.foldername(name))[2]
        AND ac.status IN ('in_progress', 'needs_changes')
    )
  );
