
-- Add job_seeker to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'job_seeker';
