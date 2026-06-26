-- Add attachments column to scheduled_emails table
ALTER TABLE public.scheduled_emails ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Storage policies for email attachments in resumes bucket
-- Authenticated users can read their own files in the resumes bucket under their folder
DROP POLICY IF EXISTS "Users can read own folder files" ON storage.objects;
CREATE POLICY "Users can read own folder files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

-- Authenticated users can delete their own files in the resumes bucket under their folder
DROP POLICY IF EXISTS "Users can delete own folder files" ON storage.objects;
CREATE POLICY "Users can delete own folder files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);
