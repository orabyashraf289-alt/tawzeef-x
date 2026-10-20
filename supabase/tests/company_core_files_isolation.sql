-- Disposable replay database only: all synthetic records roll back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES
 ('62000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','isolation-a@example.test'),
 ('62000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','isolation-b@example.test');
INSERT INTO public.companies (id,name) VALUES
 ('61000000-0000-0000-0000-000000000001','Isolation A'),
 ('61000000-0000-0000-0000-000000000002','Isolation B');
INSERT INTO public.companies (id,name,parent_company_id) VALUES
 ('61000000-0000-0000-0000-000000000003','Branch A','61000000-0000-0000-0000-000000000001');
INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
 ('61000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','owner'),
 ('61000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000002','owner');
INSERT INTO public.jobs (id,user_id,company_id,title,department,location,type) VALUES
 ('63000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000003','Branch A job','Test','Test','full-time'),
 ('63000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000002','B job','Test','Test','full-time');
INSERT INTO storage.objects (bucket_id,name) VALUES
 ('resumes','applications/63000000-0000-0000-0000-000000000001/66000000-0000-0000-0000-000000000001.pdf'),
 ('resumes','applications/63000000-0000-0000-0000-000000000002/66000000-0000-0000-0000-000000000002.pdf');
INSERT INTO public.applications (id,job_id,company_id,name,email,phone,resume_url) VALUES
 ('64000000-0000-0000-0000-000000000001','63000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000003','Applicant A','candidate-a@example.test','123','applications/63000000-0000-0000-0000-000000000001/66000000-0000-0000-0000-000000000001.pdf'),
 ('64000000-0000-0000-0000-000000000002','63000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000002','Applicant B','candidate-b@example.test','123','applications/63000000-0000-0000-0000-000000000002/66000000-0000-0000-0000-000000000002.pdf');
INSERT INTO public.candidates (id,user_id,company_id,job_id,name,email,resume_url) VALUES
 ('65000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000003','63000000-0000-0000-0000-000000000001','Candidate A','candidate-a@example.test','applications/63000000-0000-0000-0000-000000000001/66000000-0000-0000-0000-000000000001.pdf'),
 ('65000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000002','63000000-0000-0000-0000-000000000002','Candidate B','candidate-b@example.test','applications/63000000-0000-0000-0000-000000000002/66000000-0000-0000-0000-000000000002.pdf');
SET LOCAL session_replication_role = origin;
GRANT SELECT,INSERT,UPDATE ON public.companies,public.jobs,public.candidates,public.applications TO authenticated;
GRANT SELECT ON storage.objects TO authenticated;
GRANT SELECT ON public.agency_members, public.agency_assignments, public.agencies TO authenticated;
DO $$ BEGIN
 IF (SELECT public FROM storage.buckets WHERE id='resumes')
    OR has_function_privilege('authenticated','public.guard_resume_reference()','EXECUTE')
    OR has_function_privilege('anon','public.guard_resume_reference()','EXECUTE')
 THEN RAISE EXCEPTION 'Private CV guard or bucket missing'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claim.email','isolation-a@example.test',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
 IF (SELECT count(*) FROM public.companies WHERE id IN ('61000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000002')) <> 1
 OR (SELECT count(*) FROM public.jobs WHERE id IN ('63000000-0000-0000-0000-000000000001','63000000-0000-0000-0000-000000000002')) <> 1
 OR (SELECT count(*) FROM public.candidates WHERE id IN ('65000000-0000-0000-0000-000000000001','65000000-0000-0000-0000-000000000002')) <> 1
 OR (SELECT count(*) FROM public.applications WHERE id IN ('64000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000002')) <> 1
 OR (SELECT count(*) FROM storage.objects WHERE bucket_id='resumes' AND name LIKE 'applications/63000000-0000-0000-0000-00000000000%') <> 1
 THEN RAISE EXCEPTION 'Company A isolation or branch access failed'; END IF;
 UPDATE public.candidates SET name='Forged' WHERE id='65000000-0000-0000-0000-000000000002';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'Foreign candidate updated'; END IF;
 UPDATE public.applications SET status='Forged' WHERE id='64000000-0000-0000-0000-000000000002';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'Foreign application updated'; END IF;
 BEGIN
 UPDATE public.applications SET resume_url='applications/63000000-0000-0000-0000-000000000002/66000000-0000-0000-0000-000000000002.pdf'
 WHERE id='64000000-0000-0000-0000-000000000001';
 RAISE EXCEPTION 'Foreign application CV linked';
 EXCEPTION WHEN check_violation THEN
 IF SQLERRM <> 'invalid_application_resume_reference' THEN RAISE; END IF; END;
 BEGIN
 UPDATE public.candidates SET resume_url='applications/63000000-0000-0000-0000-000000000002/66000000-0000-0000-0000-000000000002.pdf'
 WHERE id='65000000-0000-0000-0000-000000000001';
 RAISE EXCEPTION 'Foreign candidate CV linked';
 EXCEPTION WHEN check_violation THEN
 IF SQLERRM <> 'invalid_candidate_resume_reference' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claim.email','isolation-b@example.test',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.candidates WHERE id IN ('65000000-0000-0000-0000-000000000001','65000000-0000-0000-0000-000000000002')) <> 1
 OR (SELECT count(*) FROM public.applications WHERE id IN ('64000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000002')) <> 1
 OR (SELECT count(*) FROM storage.objects WHERE bucket_id='resumes' AND name LIKE 'applications/63000000-0000-0000-0000-00000000000%') <> 1
 THEN RAISE EXCEPTION 'Company B isolation failed'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
