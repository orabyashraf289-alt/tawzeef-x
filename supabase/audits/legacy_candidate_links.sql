-- Read-only review of the two archived July candidate repairs.
-- No candidate names, contact details, row IDs, or Auth records are returned.
-- Run separately from migrations. Do not infer a job's tenant from membership.
WITH membership_counts AS (
  SELECT user_id, count(DISTINCT company_id) AS companies
  FROM public.company_members GROUP BY user_id
), jobs_review AS (
  SELECT
    count(*) FILTER (WHERE j.company_id IS NULL) AS missing_company,
    count(*) FILTER (WHERE j.company_id IS NULL AND m.companies = 1) AS single_current_membership,
    count(*) FILTER (WHERE j.company_id IS NULL AND m.companies > 1) AS ambiguous_memberships,
    count(*) FILTER (WHERE j.company_id IS NULL AND m.user_id IS NULL) AS no_membership
  FROM public.jobs j LEFT JOIN membership_counts m ON m.user_id = j.user_id
), candidates_review AS (
  SELECT
    count(*) FILTER (WHERE c.company_id IS NULL) AS missing_company,
    count(*) FILTER (WHERE c.company_id IS NULL AND j.company_id IS NOT NULL) AS company_link_from_job,
    count(*) FILTER (WHERE c.user_id IS NULL) AS missing_user,
    count(*) FILTER (WHERE c.user_id IS NULL AND c.job_id IS NULL) AS missing_user_without_job,
    count(*) FILTER (WHERE c.user_id IS NULL AND c.company_id = j.company_id AND j.user_id IS NOT NULL) AS user_link_from_same_company_job,
    count(*) FILTER (WHERE c.company_id IS NOT NULL AND j.company_id IS NOT NULL AND c.company_id <> j.company_id) AS conflicting_company,
    count(*) FILTER (WHERE c.job_id IS NOT NULL AND j.id IS NULL) AS missing_job
  FROM public.candidates c LEFT JOIN public.jobs j ON j.id = c.job_id
), applications_review AS (
  SELECT
    count(*) FILTER (WHERE a.company_id IS NULL) AS missing_company,
    count(*) FILTER (WHERE a.company_id IS NULL AND j.company_id IS NOT NULL) AS company_link_from_job,
    count(*) FILTER (WHERE a.company_id IS NOT NULL AND j.company_id IS NOT NULL AND a.company_id <> j.company_id) AS conflicting_company,
    count(*) FILTER (WHERE j.id IS NULL) AS missing_job
  FROM public.applications a LEFT JOIN public.jobs j ON j.id = a.job_id
)
SELECT
  (SELECT row_to_json(r) FROM jobs_review r) AS jobs,
  (SELECT row_to_json(r) FROM candidates_review r) AS candidates,
  (SELECT row_to_json(r) FROM applications_review r) AS applications;
