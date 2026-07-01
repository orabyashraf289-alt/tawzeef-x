-- 1) Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- 2) Drop any conflicting policies on storage.objects for the avatars bucket
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;

-- 3) Create robust, modern policies for avatars bucket
-- This policy allows logged-in users to upload files to a folder matching their user ID
CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');

-- This policy allows logged-in users to update/overwrite files in a folder matching their user ID
CREATE POLICY "Authenticated users can update avatars" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');

-- This policy allows the public to read and load avatar images (necessary for browser loading)
CREATE POLICY "Anyone can view avatars" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'avatars');
