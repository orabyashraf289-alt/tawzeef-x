-- Identity preserves distinct employees with matching names. Legacy rows stay intact.
alter table public.performance_evaluations
  add column evalee_user_id uuid references auth.users(id) on delete set null;

-- NOT VALID preserves legacy data while rejecting invalid new inserts/updates.
alter table public.performance_evaluations
  add constraint performance_evaluation_score_range check (
    productivity between 1 and 10 and leadership between 1 and 10
    and teamwork between 1 and 10 and technical between 1 and 10
    and communication between 1 and 10
  ) not valid,
  add constraint performance_evaluation_relationship check (
    relationship in ('self', 'manager', 'peers', 'subordinates')
  ) not valid,
  add constraint performance_evaluation_names check (
    length(btrim(evalee_name)) > 0 and length(btrim(reviewer_name)) > 0
  ) not valid;

-- Existing author-only RLS is deliberately preserved. This remains a private
-- manual log, not a company-wide independent or anonymous 360 review cycle.
