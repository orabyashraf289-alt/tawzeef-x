
-- Replace the auth-only insert policy so anonymous applicants can still upload via public job apply forms
DROP POLICY IF EXISTS "Authenticated users can upload resumes" ON storage.objects;

CREATE POLICY "Anyone can upload to resumes bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'resumes');
