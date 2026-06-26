
-- 1) Remove public SELECT on assessments. The candidate-facing
--    get_assessment_for_candidate RPC (SECURITY DEFINER) already returns
--    only the safe columns, and submit_assessment_response reads internally.
DROP POLICY IF EXISTS "Anyone can view active assessments by token" ON public.assessments;

-- 2) Fix anon resume-upload extension check (".docx" needed leading dot)
DROP POLICY IF EXISTS "Public can upload application resumes" ON storage.objects;
CREATE POLICY "Public can upload application resumes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = 'applications'
  AND (
    lower(right(name, 4)) IN ('.pdf', '.doc')
    OR lower(right(name, 5)) = '.docx'
  )
);
