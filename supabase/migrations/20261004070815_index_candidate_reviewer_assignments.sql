-- Cover tenant-scoped candidate lookups and the composite candidate foreign key.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX candidate_reviewer_company_candidate_idx
  ON public.candidate_reviewer_assignments(company_id, candidate_id);
