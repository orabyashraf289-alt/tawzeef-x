-- Add company branding columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo text DEFAULT '';