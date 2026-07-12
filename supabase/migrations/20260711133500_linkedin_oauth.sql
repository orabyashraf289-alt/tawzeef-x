-- Add OAuth and App credentials columns to linkedin_settings
ALTER TABLE public.linkedin_settings 
ADD COLUMN IF NOT EXISTS access_token text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS linkedin_urn text,
ADD COLUMN IF NOT EXISTS linkedin_name text,
ADD COLUMN IF NOT EXISTS linkedin_avatar text,
ADD COLUMN IF NOT EXISTS custom_client_id text,
ADD COLUMN IF NOT EXISTS custom_client_secret text;
