-- Add transcript and recording columns to interviews
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS recording_url text;

-- Create storage bucket for interview recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('interview-recordings', 'interview-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own recordings
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);