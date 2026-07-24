-- Clean Slate Production Initialization Migration
-- Purges all demo/test jobs, candidates, applications, interviews, offers, and candidate accounts.
-- Preserves ONLY:
-- 1. Master Tawzeef-X Super Admin Account.
-- 2. Master Company Owner Account for "مجموعة عبد الرحمن الخطيب" (Abdulrahman Al-Khatib Group).

BEGIN;

-- 1. Truncate / Delete Candidate & Application Data
DELETE FROM public.candidate_scorecards;
DELETE FROM public.candidate_evaluation_scores;
DELETE FROM public.candidate_assessments;
DELETE FROM public.candidate_notes;
DELETE FROM public.interview_guides;
DELETE FROM public.interviews;
DELETE FROM public.offers;
DELETE FROM public.job_applications;
DELETE FROM public.applications;
DELETE FROM public.candidates;
DELETE FROM public.resume_archive;

-- 2. Truncate / Delete Jobs & Approval Chains
DELETE FROM public.job_approval_chains;
DELETE FROM public.job_stages;
DELETE FROM public.jobs;

-- 3. Truncate / Delete Tasks & Evaluations (0 initial items)
DELETE FROM public.tasks;
DELETE FROM public.performance_evaluations;

-- 4. Clean System Logs & Challenges
DELETE FROM public.audit_logs;
DELETE FROM public.email_tracking;
DELETE FROM public.scheduled_emails;
DELETE FROM public.webhook_deliveries;
DELETE FROM public.login_otp_challenges;

-- 5. Delete Test Candidate & Temp User Accounts from auth.users
-- Keeps ONLY Master Tawzeef-X Admin and "مجموعة عبد الرحمن الخطيب" Primary Owner
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

COMMIT;
