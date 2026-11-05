-- Disposable PostgreSQL migration-replay database only. All synthetic fixtures roll back.
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO auth.users(id,email,raw_user_meta_data) SELECT ('61000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'integrity-'||i||'@example.test','{}' FROM generate_series(1,4)i;
INSERT INTO public.companies(id,name,owner_user_id,status) VALUES
 ('61100000-0000-0000-0000-000000000001','Integrity A','61000000-0000-0000-0000-000000000001','active'),
 ('61100000-0000-0000-0000-000000000002','Integrity B','61000000-0000-0000-0000-000000000004','active');
INSERT INTO public.company_members(company_id,user_id,member_role) VALUES
 ('61100000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','owner'),
 ('61100000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000002','viewer'),
 ('61100000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000003','hr'),
 ('61100000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000004','owner');
INSERT INTO public.user_roles(user_id,role) SELECT ('61000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid, 'recruiter' FROM generate_series(1,4)i;
INSERT INTO public.jobs(id,user_id,company_id,title,department,location,type) VALUES
 ('61200000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','61100000-0000-0000-0000-000000000001','Integrity role','Test','Test','full-time');
INSERT INTO public.candidates(id,user_id,company_id,job_id,name,email,tracking_code) SELECT
 ('61300000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'61000000-0000-0000-0000-000000000001',
 CASE WHEN i=3 THEN '61100000-0000-0000-0000-000000000002'::uuid ELSE '61100000-0000-0000-0000-000000000001'::uuid END,
 CASE WHEN i=3 THEN NULL ELSE '61200000-0000-0000-0000-000000000001'::uuid END,
 'Synthetic candidate '||i,'candidate-'||i||'@example.test','TX-'||repeat(i::text,32) FROM generate_series(1,3)i;
INSERT INTO public.question_bank(id,user_id,company_id,question_text,question_type,correct_answer,points) VALUES
 ('61400000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','61100000-0000-0000-0000-000000000001','Choose','multiple_choice',NULL,2),
 ('61400000-0000-0000-0000-000000000002','61000000-0000-0000-0000-000000000001','61100000-0000-0000-0000-000000000001','Match','matching',NULL,3),
 ('61400000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000001','61100000-0000-0000-0000-000000000001','Order','ordering',NULL,2),
 ('61400000-0000-0000-0000-000000000004','61000000-0000-0000-0000-000000000001','61100000-0000-0000-0000-000000000001','Explain','open_ended','REFERENCE-SECRET',3);
INSERT INTO public.question_options(id,question_id,option_text,is_correct,sort_order) VALUES
 ('61500000-0000-0000-0000-000000000001','61400000-0000-0000-0000-000000000001','correct choice',true,0),
 ('61500000-0000-0000-0000-000000000002','61400000-0000-0000-0000-000000000001','other choice',false,1),
 ('61500000-0000-0000-0000-000000000003','61400000-0000-0000-0000-000000000002','left one||right one',true,0),
 ('61500000-0000-0000-0000-000000000004','61400000-0000-0000-0000-000000000002','left two||right two',true,1),
 ('61500000-0000-0000-0000-000000000005','61400000-0000-0000-0000-000000000003','first',true,0),
 ('61500000-0000-0000-0000-000000000006','61400000-0000-0000-0000-000000000003','second',true,1);
INSERT INTO public.assessments(id,user_id,company_id,job_id,title,token,duration_minutes,passing_score) VALUES
 ('61600000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','61100000-0000-0000-0000-000000000001','61200000-0000-0000-0000-000000000001','Integrity test','INTEGRITY-TEST',1,70);
INSERT INTO public.assessment_questions(assessment_id,question_id,sort_order,points_override) SELECT
 '61600000-0000-0000-0000-000000000001',('61400000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,i,CASE WHEN i=4 THEN 5 ELSE NULL END FROM generate_series(1,4)i;
SET LOCAL session_replication_role=origin;
CREATE FUNCTION pg_temp.expect(ok boolean,msg text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERT: %',msg;END IF;END$$;
CREATE FUNCTION pg_temp.denied(query text) RETURNS boolean LANGUAGE plpgsql AS $$BEGIN EXECUTE query;RETURN false;EXCEPTION WHEN OTHERS THEN RETURN true;END$$;
DO $$
<<verify>>
DECLARE s jsonb; second_attempt jsonb; result jsonb; claim jsonb; id uuid; secret uuid; co uuid:='61100000-0000-0000-0000-000000000001'; slot uuid; slot2 uuid; answers jsonb; created jsonb; before_count integer;
BEGIN
 PERFORM pg_temp.expect(NOT has_function_privilege('anon','public.start_assessment_response(text,text,text)','EXECUTE'),'legacy unbound start open');
 PERFORM pg_temp.expect(NOT has_function_privilege('authenticated','public.submit_assessment_response(uuid,jsonb,integer,jsonb)','EXECUTE'),'legacy capability-free submission open');
 PERFORM pg_temp.expect(NOT has_function_privilege('authenticated','public.apply_ai_evaluations(uuid,jsonb)','EXECUTE'),'browser scoring open');
 PERFORM pg_temp.expect(NOT has_function_privilege('anon','public.get_assessment_review_questions(uuid)','EXECUTE'),'anonymous reviewer content access');
 PERFORM pg_temp.expect(NOT has_function_privilege('anon','public.claim_assessment_grading(uuid,uuid)','EXECUTE'),'grading snapshot exposed');
 PERFORM pg_temp.expect(NOT has_table_privilege('authenticated','public.assessment_responses','UPDATE'),'raw browser grade writes');
 PERFORM set_config('request.jwt.claim.sub','',true);EXECUTE 'SET LOCAL ROLE anon';
 result:=public.get_assessment_for_candidate('INTEGRITY-TEST');
 PERFORM pg_temp.expect(NOT (result ? 'questions'),'question content exposed before timed start');
 PERFORM pg_temp.expect(pg_temp.denied($q$SELECT public.begin_assessment_attempt('INTEGRITY-TEST','TX-33333333333333333333333333333333')$q$),'foreign application accepted');
 s:=public.begin_assessment_attempt('INTEGRITY-TEST','TX-11111111111111111111111111111111');id:=(s->>'response_id')::uuid;secret:=(s->>'access_token')::uuid;
 PERFORM pg_temp.expect((public.begin_assessment_attempt('INTEGRITY-TEST','TX-11111111111111111111111111111111')->>'response_id')=id::text,'second attempt reset timer');
 PERFORM pg_temp.expect(s::text NOT LIKE '%REFERENCE-SECRET%' AND s::text NOT LIKE '%is_correct%' AND s::text NOT LIKE '%sort_order%' AND s::text NOT LIKE '%left one||right one%','answer key leaked');
 PERFORM pg_temp.expect((SELECT jsonb_array_length(q->'matching_choices')=2 FROM jsonb_array_elements(s->'questions')q WHERE q->>'question_type'='matching'),'matching choices absent');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.save_assessment_attempt(%L,%L,%L,1)',id,gen_random_uuid(),'[]')),'wrong attempt capability accepted');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.save_assessment_attempt(%L,%L,%L,1)',id,secret,'[{"question_id":"foreign","answer":"x"}]')),'foreign answer accepted');
 answers:='[{"question_id":"61400000-0000-0000-0000-000000000001","answer":"61500000-0000-0000-0000-000000000001"},{"question_id":"61400000-0000-0000-0000-000000000002","answer":"{\"61500000-0000-0000-0000-000000000003\":\"right one\",\"61500000-0000-0000-0000-000000000004\":\"right two\"}"},{"question_id":"61400000-0000-0000-0000-000000000003","answer":"[\"first\",\"second\"]"},{"question_id":"61400000-0000-0000-0000-000000000004","answer":"My answer"}]';
 PERFORM public.save_assessment_attempt(id,secret,answers,2);
 PERFORM public.save_assessment_attempt(id,secret,'[]',1);
 EXECUTE 'RESET ROLE';
 PERFORM pg_temp.expect((SELECT revision=2 AND saved_answers=answers FROM hiring_private.assessment_attempts WHERE response_id=verify.id),'stale autosave overwrote answers');
 PERFORM pg_temp.expect((SELECT candidate_id='61300000-0000-0000-0000-000000000001' FROM public.assessment_responses WHERE assessment_responses.id=verify.id),'response not candidate bound');
 -- Editing the question bank after start must not alter the immutable score contract.
 UPDATE public.question_bank SET points=99 WHERE question_bank.id='61400000-0000-0000-0000-000000000004';
 EXECUTE 'SET LOCAL ROLE anon';
 result:=public.finish_assessment_attempt(id,secret,answers);
 PERFORM pg_temp.expect(result->>'status'='pending_review' AND (result->>'total_score')::int=7 AND (result->>'max_score')::int=12,'provisional score or override incorrect');
 PERFORM pg_temp.expect(NOT(result ? 'open_answers') AND result::text NOT LIKE '%REFERENCE-SECRET%','grading references returned to candidate');
 PERFORM pg_temp.expect(public.finish_assessment_attempt(id,secret,'[]')=result,'repeat submission changed answer');
 EXECUTE 'RESET ROLE';EXECUTE 'SET LOCAL ROLE service_role';
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.claim_assessment_grading(%L,%L)',id,gen_random_uuid())),'incorrect grading capability accepted');
 claim:=public.claim_assessment_grading(id,secret);
 PERFORM pg_temp.expect(claim->'questions'->0->>'correct_answer'='REFERENCE-SECRET','server grading snapshot lost');
 PERFORM pg_temp.expect((public.claim_assessment_grading(id,secret)->'result'->>'status')='pending_review','parallel grading not leased');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.complete_assessment_grading(%L,%L,%L)',id,claim->>'claim','[{"question_id":"61400000-0000-0000-0000-000000000004","score":999}]')),'out of range AI score accepted');
 result:=public.complete_assessment_grading(id,(claim->>'claim')::uuid,'[{"question_id":"61400000-0000-0000-0000-000000000004","score":4,"feedback":"Reviewed"}]');
 PERFORM pg_temp.expect(result->>'status'='completed' AND (result->>'total_score')::int=11,'trusted grading not persisted');
 EXECUTE 'RESET ROLE';EXECUTE 'SET LOCAL ROLE anon';
 second_attempt:=public.begin_assessment_attempt('INTEGRITY-TEST','TX-22222222222222222222222222222222');
 PERFORM public.save_assessment_attempt((second_attempt->>'response_id')::uuid,(second_attempt->>'access_token')::uuid,'[]',1);
 EXECUTE 'RESET ROLE';
 UPDATE hiring_private.assessment_attempts SET expires_at=now()-interval '1 minute' WHERE response_id=(second_attempt->>'response_id')::uuid;
 EXECUTE 'SET LOCAL ROLE anon';
 result:=public.save_assessment_attempt((second_attempt->>'response_id')::uuid,(second_attempt->>'access_token')::uuid,answers,2);
 PERFORM pg_temp.expect(result->>'saved'='false','late autosave accepted');
 result:=public.finish_assessment_attempt((second_attempt->>'response_id')::uuid,(second_attempt->>'access_token')::uuid,answers);
 PERFORM pg_temp.expect((result->>'total_score')::int=0 AND (result->>'timed_out')::boolean,'late answers counted');
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000002',true);EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM pg_temp.expect(public.has_hiring_permission(co,'jobs','read') AND NOT public.has_hiring_permission(co,'jobs','create'),'viewer baseline incorrect');
 PERFORM pg_temp.expect(pg_temp.denied(format('INSERT INTO public.jobs(user_id,company_id,title,department,location,type) VALUES(auth.uid(),%L,''unauthorized'',''Test'',''Test'',''full-time'')',co)),'viewer can create via API');
 UPDATE public.jobs SET title='UNAUTHORIZED' WHERE jobs.id='61200000-0000-0000-0000-000000000001';
 PERFORM pg_temp.expect((SELECT title='Integrity role' FROM public.jobs WHERE jobs.id='61200000-0000-0000-0000-000000000001'),'viewer can update via API');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.review_assessment_response(%L,%L)',id,'[]')),'viewer can review score');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.get_assessment_result_delivery(%L)',id)),'viewer can export email delivery payload');
 EXECUTE 'RESET ROLE';
 INSERT INTO public.granular_permissions(company_id,role_key,module_key,can_read,can_create,can_edit,can_delete) VALUES(co,'recruiter','jobs',true,true,false,false);
 INSERT INTO public.granular_permissions(company_id,role_key,user_id,module_key,can_read,can_create,can_edit,can_delete) VALUES(co,'user:61000000-0000-0000-0000-000000000003','61000000-0000-0000-0000-000000000003','jobs',false,true,true,true);
 PERFORM set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000003',true);EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM pg_temp.expect(NOT public.has_hiring_permission(co,'jobs','edit') AND NOT public.has_hiring_permission(co,'jobs','read'),'member deny does not override role');
 PERFORM pg_temp.expect((SELECT count(*)=0 FROM public.jobs WHERE company_id=co),'read denied rows still visible');
 PERFORM pg_temp.expect(NOT public.has_hiring_permission('61100000-0000-0000-0000-000000000002','jobs','create'),'foreign company access');
 PERFORM pg_temp.expect((SELECT count(*)=0 FROM public.candidates WHERE company_id='61100000-0000-0000-0000-000000000002'),'foreign company candidates readable');
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);EXECUTE 'SET LOCAL ROLE authenticated';
 result:=public.get_assessment_review_questions(id);
 PERFORM pg_temp.expect((SELECT (q->>'points')::int=5 AND q->>'question_text'='Explain' FROM jsonb_array_elements(result)q WHERE q->>'id'='61400000-0000-0000-0000-000000000004'),'review question snapshot changed with the bank');
 PERFORM pg_temp.expect(result::text NOT LIKE '%REFERENCE-SECRET%' AND result::text NOT LIKE '%is_correct%','review text leaks marking references');
 EXECUTE 'RESET ROLE';UPDATE public.assessments SET passing_score=90 WHERE assessments.id='61600000-0000-0000-0000-000000000001';EXECUTE 'SET LOCAL ROLE authenticated';
 -- Human review must keep the attempt's original point caps, even if the bank changed.
 result:=public.review_assessment_response(id,'[{"question_id":"61400000-0000-0000-0000-000000000001","score":2},{"question_id":"61400000-0000-0000-0000-000000000002","score":3},{"question_id":"61400000-0000-0000-0000-000000000003","score":2},{"question_id":"61400000-0000-0000-0000-000000000004","score":3}]');
 PERFORM pg_temp.expect((result->>'total_score')::int=10 AND (result->>'max_score')::int=12,'manual review ignored immutable caps');
 result:=public.get_assessment_result_delivery(id);
 PERFORM pg_temp.expect((result->>'passing_score')::int=70 AND (result->>'total_score')::int=10 AND result->>'candidate_email'=(SELECT email FROM public.candidates WHERE candidates.id='61300000-0000-0000-0000-000000000001'),'email recipient or grade not saved data');
 PERFORM pg_temp.expect(result::text NOT LIKE '%REFERENCE-SECRET%' AND result::text NOT LIKE '%access_token%','delivery payload leaks grading capability/reference');
 -- Create-only access works atomically, but cannot modify an existing question's options.
 EXECUTE 'RESET ROLE';
 INSERT INTO public.granular_permissions(company_id,role_key,module_key,can_read,can_create,can_edit,can_delete) VALUES(co,'recruiter','question_bank',true,true,false,false);
 EXECUTE 'SET LOCAL ROLE authenticated';
 created:=public.create_question_bank_item(co,'question','{"question_text":"Atomic question","question_type":"multiple_choice","points":2}','[{"option_text":"A","is_correct":true},{"option_text":"B","is_correct":false}]');
 PERFORM pg_temp.expect((SELECT count(*)=2 FROM public.question_options WHERE question_id=(created->>'id')::uuid),'create-only question missing children');
 PERFORM pg_temp.expect(pg_temp.denied(format('INSERT INTO public.question_options(question_id,option_text) VALUES(%L,''unauthorized addition'')',created->>'id')),'create-only permission edits old options');
 SELECT count(*) INTO before_count FROM public.assessments;
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.create_question_bank_item(%L,''assessment'',%L,%L)',co,'{"title":"Invalid linked question"}','[{"question_id":"61400000-0000-0000-0000-000000000099"}]')),'foreign/missing assessment question accepted');
 PERFORM pg_temp.expect((SELECT count(*)=before_count FROM public.assessments),'failed creation left an incomplete assessment');
 slot:=(public.interview_slot_workflow(co,'create',jsonb_build_object('date',current_date+2,'time','10:00','time_zone','Africa/Cairo','duration_minutes',30))->>'id')::uuid;
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.interview_slot_workflow(%L,''create'',%L)',co,jsonb_build_object('date',current_date+2,'time','10:15','time_zone','Africa/Cairo','duration_minutes',30))),'overlapping host availability accepted');
 PERFORM pg_temp.expect(jsonb_array_length(public.interview_slot_workflow(co,'list')->'slots')=1,'manager cannot list published slots');
 slot2:=(public.interview_slot_workflow(co,'create',jsonb_build_object('date',current_date+2,'time','11:00','time_zone','Africa/Cairo','duration_minutes',30))->>'id')::uuid;
 EXECUTE 'RESET ROLE';PERFORM set_config('request.jwt.claim.sub','',true);EXECUTE 'SET LOCAL ROLE anon';
 PERFORM pg_temp.expect(jsonb_array_length(public.candidate_interview_booking('TX-11111111111111111111111111111111')->'slots')=2,'published availability missing');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.candidate_interview_booking(''TX-33333333333333333333333333333333'',''book'',%L)',slot)),'foreign slot booked');
 result:=public.candidate_interview_booking('TX-11111111111111111111111111111111','book',slot);
 PERFORM pg_temp.expect((result->>'success')::boolean,'booking failed');
 PERFORM pg_temp.expect(public.candidate_interview_booking('TX-11111111111111111111111111111111','book',slot)=result,'booking retry not idempotent');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.candidate_interview_booking(''TX-22222222222222222222222222222222'',''book'',%L)',slot)),'double booking accepted');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.candidate_interview_booking(''TX-11111111111111111111111111111111'',''book'',%L)',slot2)),'candidate double booking accepted');
 PERFORM pg_temp.expect(pg_temp.denied(format('SELECT public.candidate_interview_booking(''TX-22222222222222222222222222222222'',''cancel'',%L)',slot)),'foreign booking canceled');
 EXECUTE 'RESET ROLE';
 PERFORM pg_temp.expect((SELECT company_id=co AND interviewer_id='61000000-0000-0000-0000-000000000001' AND starts_at IS NOT NULL FROM public.interviews WHERE interviews.id=(result->>'interviewId')::uuid),'booking company or host missing');
 EXECUTE 'SET LOCAL ROLE anon';
 PERFORM public.candidate_interview_booking('TX-11111111111111111111111111111111','cancel',slot);
 result:=public.candidate_interview_booking('TX-22222222222222222222222222222222','book',slot);
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);EXECUTE 'SET LOCAL ROLE authenticated';
 UPDATE public.interviews SET date=current_date+3,time='13:30',time_zone='Asia/Riyadh' WHERE interviews.id=(result->>'interviewId')::uuid;
 EXECUTE 'RESET ROLE';PERFORM set_config('request.jwt.claim.sub','',true);EXECUTE 'SET LOCAL ROLE anon';
 created:=public.candidate_interview_booking('TX-22222222222222222222222222222222');
 PERFORM pg_temp.expect(created->'booking'->>'id' IS NULL AND (created->'booking'->>'starts_at')::timestamptz=((current_date+3)+time '13:30') AT TIME ZONE 'Asia/Riyadh','rescheduled interview lost or time zone incorrect');
 EXECUTE 'RESET ROLE';PERFORM set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);EXECUTE 'SET LOCAL ROLE authenticated';
 UPDATE public.interviews SET status='cancelled' WHERE interviews.id=(result->>'interviewId')::uuid;
 EXECUTE 'RESET ROLE';
 PERFORM pg_temp.expect((SELECT interview_id IS NULL FROM hiring_private.booking_slots WHERE booking_slots.id=slot),'manual cancellation left the slot reserved');
 -- Removed or banned users cannot keep permissions via a stale access token.
 UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE auth.users.id='61000000-0000-0000-0000-000000000001';
 PERFORM set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM pg_temp.expect(NOT public.has_hiring_permission(co,'interviews','create'),'banned account has operation permission');
 EXECUTE 'RESET ROLE';
END$$;
ROLLBACK;
