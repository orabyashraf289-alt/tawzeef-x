-- Keep agency case authorization tied to the candidate's actual tenant.
-- The candidate already has a unique (company_id, id) key.
ALTER TABLE public.agency_cases
  ADD CONSTRAINT agency_cases_company_candidate_fkey
  FOREIGN KEY (company_id, candidate_id)
  REFERENCES public.candidates (company_id, id)
  ON DELETE CASCADE;
