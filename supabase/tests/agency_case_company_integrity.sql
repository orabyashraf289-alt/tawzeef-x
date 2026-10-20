-- Disposable migration replay only. The fixture rolls back in full.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO public.companies (id, name) VALUES
  ('71000000-0000-0000-0000-000000000001', 'Case tenant A'),
  ('71000000-0000-0000-0000-000000000002', 'Case tenant B');
INSERT INTO public.agencies (id, name) VALUES
  ('72000000-0000-0000-0000-000000000001', 'Case agency');
INSERT INTO public.candidates (id, company_id, agency_id, name) VALUES
  ('73000000-0000-0000-0000-000000000001',
   '71000000-0000-0000-0000-000000000001',
   '72000000-0000-0000-0000-000000000001', 'Candidate A'),
  ('73000000-0000-0000-0000-000000000002',
   '71000000-0000-0000-0000-000000000002',
   '72000000-0000-0000-0000-000000000001', 'Candidate B');
SET LOCAL session_replication_role = origin;

INSERT INTO public.agency_cases (candidate_id, company_id, agency_id)
VALUES ('73000000-0000-0000-0000-000000000001',
        '71000000-0000-0000-0000-000000000001',
        '72000000-0000-0000-0000-000000000001');

DO $$
DECLARE violated_constraint text;
BEGIN
  BEGIN
    INSERT INTO public.agency_cases (candidate_id, company_id, agency_id)
    VALUES ('73000000-0000-0000-0000-000000000002',
            '71000000-0000-0000-0000-000000000001',
            '72000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Cross-company agency case was accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    GET STACKED DIAGNOSTICS violated_constraint = CONSTRAINT_NAME;
    IF violated_constraint <> 'agency_cases_company_candidate_fkey' THEN
      RAISE;
    END IF;
  END;
END $$;

ROLLBACK;
