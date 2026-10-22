-- CV text stays in the applicant's browser. No parsed CV text was persisted.
ALTER TABLE public.applications DROP COLUMN resume_text;
