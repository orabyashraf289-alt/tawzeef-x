-- Keep related hiring records in the same company, including branch records.
-- RLS checks who can access a row; these keys also protect writes made by
-- privileged server processes and prevent a client from linking another tenant.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- MATCH SIMPLE skips a composite foreign key if company_id is null. A linked
-- record must therefore carry a company_id before the key can protect it.
ALTER TABLE public.applications
  ADD CONSTRAINT applications_company_required
    CHECK (company_id IS NOT NULL),
  ADD CONSTRAINT applications_company_job_fkey
    FOREIGN KEY (company_id, job_id) REFERENCES public.jobs (company_id, id)
    ON DELETE CASCADE;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_linked_job_company_required
    CHECK (job_id IS NULL OR company_id IS NOT NULL),
  ADD CONSTRAINT candidates_company_job_fkey
    FOREIGN KEY (company_id, job_id) REFERENCES public.jobs (company_id, id)
    ON DELETE SET NULL (job_id);

ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_linked_candidate_company_required
    CHECK (candidate_id IS NULL OR company_id IS NOT NULL),
  ADD CONSTRAINT interviews_company_candidate_fkey
    FOREIGN KEY (company_id, candidate_id) REFERENCES public.candidates (company_id, id)
    ON DELETE CASCADE;

ALTER TABLE public.job_offers
  ADD CONSTRAINT job_offers_linked_company_required
    CHECK ((candidate_id IS NULL AND job_id IS NULL) OR company_id IS NOT NULL),
  ADD CONSTRAINT job_offers_company_candidate_fkey
    FOREIGN KEY (company_id, candidate_id) REFERENCES public.candidates (company_id, id)
    ON DELETE CASCADE,
  ADD CONSTRAINT job_offers_company_job_fkey
    FOREIGN KEY (company_id, job_id) REFERENCES public.jobs (company_id, id)
    ON DELETE SET NULL (job_id);
