-- Disposable database only. No messages are sent; all fixtures roll back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
 ('26000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','runtime-owner-a@example.test'),
 ('26000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','runtime-owner-b@example.test'),
 ('26000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','runtime-reviewer@example.test');
SET LOCAL session_replication_role = origin;
INSERT INTO public.companies (id,name) VALUES
 ('16000000-0000-0000-0000-000000000001','Runtime A'),('16000000-0000-0000-0000-000000000002','Runtime B');
INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
 ('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','owner'),
 ('16000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000002','owner'),
 ('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000003','hr');
-- Job creation has unrelated outgoing hooks, disabled only for these fixtures.
SET LOCAL session_replication_role = replica;
INSERT INTO public.jobs (id,user_id,company_id,title,department,location,type) VALUES
 ('46000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','Runtime job','Test','Test','full-time');
INSERT INTO public.candidates (id,user_id,company_id,job_id,name,email,stage,ai_score) VALUES
 ('56000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','46000000-0000-0000-0000-000000000001','Runtime candidate','runtime-candidate@example.test','seed',20);
INSERT INTO public.pipeline_stages (id,user_id,company_id,name,sort_order,transition_rules) VALUES
 ('66000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','screened',1,'{"require_ai_evaluation":true,"min_ai_score":60}'),
 ('66000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','start',2,'{}'),
 ('66000000-0000-0000-0000-000000000003','26000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000002','Foreign stage',1,'{}');
SET LOCAL session_replication_role = origin;
INSERT INTO public.automation_rules (id,company_id,title,trigger_event,conditions,actions,created_by) VALUES
 ('36000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','Stage action','candidate.stage_changed','[{"field":"stage","operator":"equals","value":"start"}]','[{"type":"assign_reviewer","payload":{"reviewer_id":"26000000-0000-0000-0000-000000000003"}},{"type":"move_stage","payload":{"stage_id":"66000000-0000-0000-0000-000000000001"}}]','26000000-0000-0000-0000-000000000001'),
 ('36000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000001','Application action','application.created','[]','[{"type":"assign_reviewer","payload":{"reviewer_id":"26000000-0000-0000-0000-000000000003"}}]','26000000-0000-0000-0000-000000000001'),
 ('36000000-0000-0000-0000-000000000003','16000000-0000-0000-0000-000000000001','Legacy text','application.created','[]','[{"type":"send_email","payload":{"details":"old draft"}}]','26000000-0000-0000-0000-000000000001'),
 ('36000000-0000-0000-0000-000000000004','16000000-0000-0000-0000-000000000001','Cycle prevention','candidate.stage_changed','[{"field":"stage","operator":"equals","value":"screened"}]','[{"type":"move_stage","payload":{"stage_id":"66000000-0000-0000-0000-000000000002"}}]','26000000-0000-0000-0000-000000000001'),
 ('36000000-0000-0000-0000-000000000005','16000000-0000-0000-0000-000000000002','Foreign rule','candidate.stage_changed','[]','[{"type":"move_stage","payload":{"stage_id":"66000000-0000-0000-0000-000000000003"}}]','26000000-0000-0000-0000-000000000002');

DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.automation_rules WHERE is_active) THEN RAISE EXCEPTION 'Existing drafts activated'; END IF;
 IF has_function_privilege('anon','public.set_automation_rule_active(uuid,uuid,boolean)','EXECUTE')
   OR has_schema_privilege('authenticated','automation_private','USAGE')
   OR has_function_privilege('authenticated','automation_private.on_application()','EXECUTE')
   OR has_table_privilege('authenticated','public.candidate_reviewer_assignments','INSERT') THEN
   RAISE EXCEPTION 'Execution privileges exposed';
 END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','26000000-0000-0000-0000-000000000003',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
   PERFORM public.set_automation_rule_active('16000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000002',true);
   RAISE EXCEPTION 'Member activated a rule';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','26000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN
 BEGIN
   PERFORM public.set_automation_rule_active('16000000-0000-0000-0000-000000000002','36000000-0000-0000-0000-000000000005',true);
   RAISE EXCEPTION 'Cross-tenant activation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM public.set_automation_rule_active('16000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000003',true);
   RAISE EXCEPTION 'Legacy email draft activated';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 -- Save an invalid target as a draft; activation must validate the tenant.
 UPDATE public.automation_rules SET actions='[{"type":"move_stage","payload":{"stage_id":"66000000-0000-0000-0000-000000000003"}}]'
   WHERE id='36000000-0000-0000-0000-000000000003';
 BEGIN
   PERFORM public.set_automation_rule_active('16000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000003',true);
   RAISE EXCEPTION 'Foreign stage activated';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 UPDATE public.automation_rules SET actions='[{"type":"assign_reviewer","payload":{"reviewer_id":"26000000-0000-0000-0000-000000000002"}}]'
   WHERE id='36000000-0000-0000-0000-000000000003';
 BEGIN
   PERFORM public.set_automation_rule_active('16000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000003',true);
   RAISE EXCEPTION 'Foreign reviewer activated';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT public.set_automation_rule_active('16000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000001',true);
SELECT public.set_automation_rule_active('16000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000002',true);
SELECT public.set_automation_rule_active('16000000-0000-0000-0000-000000000001','36000000-0000-0000-0000-000000000004',true);
RESET ROLE;
UPDATE public.automation_rules SET is_active=true WHERE id='36000000-0000-0000-0000-000000000005';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.candidate_reviewer_assignments) THEN RAISE EXCEPTION 'Activation replayed old candidates'; END IF;
END $$;
-- Rule-level atomic rollback: reviewer assignment precedes a denied stage move.
UPDATE public.candidates SET stage='start' WHERE id='56000000-0000-0000-0000-000000000001';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.candidate_reviewer_assignments) THEN RAISE EXCEPTION 'Partial action committed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.automation_logs WHERE rule_id='36000000-0000-0000-0000-000000000001'
    AND status='failed' AND execution_details->>'code'='score_required') THEN RAISE EXCEPTION 'Stage prerequisite bypassed or error lost'; END IF;
 IF (SELECT stage FROM public.candidates WHERE id='56000000-0000-0000-0000-000000000001') <> 'start' THEN RAISE EXCEPTION 'Originating stage event rolled back'; END IF;
 IF EXISTS (SELECT 1 FROM public.automation_logs WHERE company_id='16000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Foreign rule ran'; END IF;
END $$;
UPDATE public.candidates SET stage='seed',ai_score=80 WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='start' WHERE id='56000000-0000-0000-0000-000000000001';
DO $$ DECLARE n integer; BEGIN
 IF (SELECT stage FROM public.candidates WHERE id='56000000-0000-0000-0000-000000000001') <> 'screened' THEN RAISE EXCEPTION 'Stage action failed or loop occurred'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.candidate_reviewer_assignments WHERE candidate_id='56000000-0000-0000-0000-000000000001' AND reviewer_id='26000000-0000-0000-0000-000000000003') THEN RAISE EXCEPTION 'Reviewer missing'; END IF;
 IF (SELECT user_id FROM public.candidates WHERE id='56000000-0000-0000-0000-000000000001') <> '26000000-0000-0000-0000-000000000001' THEN RAISE EXCEPTION 'Assignment changed candidate ownership'; END IF;
 IF (SELECT count(*) FROM public.automation_logs) <> 6 THEN RAISE EXCEPTION 'Unexpected cascading events'; END IF;
 SELECT count(*) INTO n FROM public.automation_logs;
 UPDATE public.candidates SET stage=stage WHERE id='56000000-0000-0000-0000-000000000001';
 IF (SELECT count(*) FROM public.automation_logs) <> n THEN RAISE EXCEPTION 'No-op update emitted an event'; END IF;
END $$;
-- Actual application trigger creates/links the candidate before automation runs.
INSERT INTO public.applications (id,job_id,company_id,name,email,phone) VALUES
 ('76000000-0000-0000-0000-000000000001','46000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','New fixture','runtime-new@example.test','000');
DO $$ DECLARE candidate uuid; n integer; BEGIN
 SELECT id INTO candidate FROM public.candidates WHERE email='runtime-new@example.test' AND company_id='16000000-0000-0000-0000-000000000001';
 IF candidate IS NULL OR NOT EXISTS (SELECT 1 FROM public.candidate_reviewer_assignments WHERE candidate_id=candidate) THEN RAISE EXCEPTION 'Application event did not assign reviewer'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.automation_logs WHERE entity_id='76000000-0000-0000-0000-000000000001' AND status='success') THEN RAISE EXCEPTION 'Application success missing'; END IF;
 PERFORM automation_private.run_rules('16000000-0000-0000-0000-000000000001','application.created',candidate,candidate,'86000000-0000-0000-0000-000000000001');
 SELECT count(*) INTO n FROM public.automation_logs;
 PERFORM automation_private.run_rules('16000000-0000-0000-0000-000000000001','application.created',candidate,candidate,'86000000-0000-0000-0000-000000000001');
 IF (SELECT count(*) FROM public.automation_logs) <> n THEN RAISE EXCEPTION 'Same event ran twice'; END IF;
END $$;
-- Editing a live configuration pauses it; direct is_active updates remain denied.
SELECT set_config('request.jwt.claim.sub','26000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
UPDATE public.automation_rules SET conditions='[{"field":"ai_score","operator":"greater_than","value":40}]' WHERE id='36000000-0000-0000-0000-000000000002';
DO $$ BEGIN
 IF (SELECT is_active FROM public.automation_rules WHERE id='36000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Config edit remained active'; END IF;
 BEGIN
   UPDATE public.automation_rules SET is_active=true WHERE id='36000000-0000-0000-0000-000000000002';
   RAISE EXCEPTION 'Client bypassed activation RPC';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','26000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.candidate_reviewer_assignments) THEN RAISE EXCEPTION 'Assignments leaked across tenants'; END IF;
END $$;
RESET ROLE;
-- Changing a stage after activation must be validated again on execution.
UPDATE public.pipeline_stages SET is_active=false WHERE id='66000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='start' WHERE id='56000000-0000-0000-0000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.automation_logs WHERE status='failed' AND execution_details->>'code'='invalid_stage') THEN RAISE EXCEPTION 'Stale target was executed'; END IF;
 IF (SELECT stage FROM public.candidates WHERE id='56000000-0000-0000-0000-000000000001') <> 'start' THEN RAISE EXCEPTION 'Failure prevented user change'; END IF;
END $$;
-- Remaining prerequisite gates also fail closed without cancelling the user event.
UPDATE public.pipeline_stages SET is_active=true, transition_rules='{"require_interview":true}' WHERE id='66000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='seed' WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='start' WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.pipeline_stages SET transition_rules='{"require_assessment":true}' WHERE id='66000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='seed' WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='start' WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.pipeline_stages SET transition_rules='{"require_ai_evaluation":true}' WHERE id='66000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='seed',ai_score=NULL WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='start' WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.company_members SET member_role='viewer' WHERE user_id='26000000-0000-0000-0000-000000000003';
UPDATE public.candidates SET stage='seed' WHERE id='56000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET stage='start' WHERE id='56000000-0000-0000-0000-000000000001';
DO $$ DECLARE code text; BEGIN
 FOREACH code IN ARRAY ARRAY['interview_required','assessment_required','evaluation_required','invalid_reviewer'] LOOP
   IF NOT EXISTS (SELECT 1 FROM public.automation_logs l WHERE l.status='failed' AND l.execution_details->>'code'=code) THEN
     RAISE EXCEPTION 'Expected prerequisite failure: %', code;
   END IF;
 END LOOP;
END $$;
UPDATE public.company_members SET member_role='hr' WHERE user_id='26000000-0000-0000-0000-000000000003';
UPDATE public.automation_rules SET conditions='[]' WHERE id='36000000-0000-0000-0000-000000000002';
UPDATE public.automation_rules SET is_active=true WHERE id='36000000-0000-0000-0000-000000000002';
-- Legacy duplicate links must never choose an arbitrary candidate.
SET LOCAL session_replication_role = replica;
INSERT INTO public.candidates (id,user_id,company_id,job_id,name,email) VALUES
 ('56000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','46000000-0000-0000-0000-000000000001','Duplicate fixture','runtime-candidate@example.test');
SET LOCAL session_replication_role = origin;
INSERT INTO public.applications (id,job_id,company_id,name,email,phone) VALUES
 ('76000000-0000-0000-0000-000000000002','46000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','Duplicate application','runtime-candidate@example.test','000');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.automation_logs WHERE entity_id='76000000-0000-0000-0000-000000000002' AND status='failed'
   AND execution_details->>'code'='candidate_link_ambiguous') THEN RAISE EXCEPTION 'Ambiguous candidate link executed'; END IF;
 BEGIN
   INSERT INTO public.candidate_reviewer_assignments(company_id,candidate_id,reviewer_id)
     VALUES('16000000-0000-0000-0000-000000000002','56000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000002');
   RAISE EXCEPTION 'Assignment crossed company boundary';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
-- Pausing takes effect for subsequent real events.
UPDATE public.automation_rules SET is_active=false WHERE id='36000000-0000-0000-0000-000000000002';
INSERT INTO public.applications (id,job_id,company_id,name,email,phone) VALUES
 ('76000000-0000-0000-0000-000000000003','46000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','Paused fixture','runtime-paused@example.test','000');
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.automation_logs WHERE entity_id='76000000-0000-0000-0000-000000000003') THEN RAISE EXCEPTION 'Paused rule executed'; END IF;
END $$;
ROLLBACK;
