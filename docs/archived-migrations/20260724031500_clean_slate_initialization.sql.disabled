-- Fail-Safe Clean Slate Production Initialization Migration
-- Purges all demo/test jobs, candidates, applications, interviews, offers, and candidate accounts.
-- Preserves ONLY:
-- 1. Master Tawzeef-X Super Admin Account.
-- 2. Master Company Owner Account for "مجموعة عبد الرحمن الخطيب" (Abdulrahman Al-Khatib Group).

DO $$ 
DECLARE 
  tbl text;
BEGIN
  -- Dynamically purge rows only from public tables that exist
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'candidate_scorecards', 'candidate_evaluation_scores', 'candidate_assessments',
        'candidate_notes', 'interview_guides', 'interviews', 'offers',
        'job_applications', 'applications', 'candidates', 'resume_archive',
        'job_approval_chains', 'job_stages', 'jobs', 'tasks', 'performance_evaluations',
        'audit_logs', 'email_tracking', 'scheduled_emails', 'webhook_deliveries', 'login_otp_challenges'
      )
  LOOP
    EXECUTE 'DELETE FROM public.' || quote_ident(tbl);
  END LOOP;
END $$;

-- Clean up auth.users except Super Admin & Primary Company Owner
DELETE FROM auth.users 
WHERE email NOT IN (
  SELECT email FROM auth.users 
  WHERE email LIKE '%tawzeef%' 
     OR email LIKE '%khatib%' 
     OR email LIKE '%al-khatib%' 
     OR email LIKE '%alkhatib%' 
     OR email LIKE '%admin%' 
     OR email LIKE '%owner%'
);
