-- Disposable integration checks; all records and trigger changes roll back.
BEGIN;
ALTER TABLE public.candidates DISABLE TRIGGER USER;
ALTER TABLE public.candidates ENABLE TRIGGER zz_automation_candidate_stage;
ALTER TABLE public.candidates ENABLE TRIGGER zz_automation_track_stage_entry;
ALTER TABLE public.job_offers DISABLE TRIGGER USER;
ALTER TABLE public.job_offers ENABLE TRIGGER zz_automation_offer_sent;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users(id,instance_id,aud,role,email) VALUES
 ('27000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','event-a@example.test'),
 ('27000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','event-b@example.test');
INSERT INTO public.companies(id,name) VALUES
 ('17000000-0000-0000-0000-000000000001','Event A'),('17000000-0000-0000-0000-000000000002','Event B');
INSERT INTO public.company_members(company_id,user_id,member_role) VALUES
 ('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','owner'),
 ('17000000-0000-0000-0000-000000000002','27000000-0000-0000-0000-000000000002','owner');
INSERT INTO public.jobs(id,user_id,company_id,title,department,location,type) VALUES
 ('47000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','Event job','Test','Test','full-time');
INSERT INTO public.pipeline_stages(id,user_id,company_id,name,sort_order,sla_hours,transition_rules) VALUES
 ('67000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','waiting',1,2,'{}'),
 ('67000000-0000-0000-0000-000000000002','27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','reviewed',2,0,'{}'),
 ('67000000-0000-0000-0000-000000000003','27000000-0000-0000-0000-000000000002','17000000-0000-0000-0000-000000000002','waiting',1,1,'{}');
INSERT INTO public.candidates(id,user_id,company_id,job_id,name,email,stage,stage_entered_at) VALUES
 ('57000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','Historical','historical@example.test','waiting',now()-interval '1 week'),
 ('57000000-0000-0000-0000-000000000002','27000000-0000-0000-0000-000000000002','17000000-0000-0000-0000-000000000002',NULL,'Foreign','foreign@example.test','waiting',now()-interval '1 week');
SET LOCAL session_replication_role = origin;
INSERT INTO public.automation_rules(id,company_id,title,trigger_event,conditions,actions,created_by) VALUES
 ('37000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','Offer','offer.sent','[]','[{"type":"assign_reviewer","payload":{"reviewer_id":"27000000-0000-0000-0000-000000000001"}}]','27000000-0000-0000-0000-000000000001'),
 ('37000000-0000-0000-0000-000000000002','17000000-0000-0000-0000-000000000001','SLA move','sla.expired','[{"field":"stage","operator":"equals","value":"waiting"}]','[{"type":"move_stage","payload":{"stage_id":"67000000-0000-0000-0000-000000000002"}}]','27000000-0000-0000-0000-000000000001'),
 ('37000000-0000-0000-0000-000000000003','17000000-0000-0000-0000-000000000001','Later SLA','sla.expired','[{"field":"stage","operator":"equals","value":"waiting"}]','[{"type":"assign_reviewer","payload":{"reviewer_id":"27000000-0000-0000-0000-000000000001"}}]','27000000-0000-0000-0000-000000000001'),
 ('37000000-0000-0000-0000-000000000004','17000000-0000-0000-0000-000000000001','No chain','candidate.stage_changed','[{"field":"stage","operator":"equals","value":"reviewed"}]','[{"type":"move_stage","payload":{"stage_id":"67000000-0000-0000-0000-000000000001"}}]','27000000-0000-0000-0000-000000000001');
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.automation_rules WHERE is_active OR activated_at IS NOT NULL) THEN RAISE EXCEPTION 'Draft activated'; END IF;
 IF has_schema_privilege('authenticated','automation_private','USAGE')
 OR has_function_privilege('authenticated','automation_private.process_sla_expirations(timestamptz,integer)','EXECUTE')
 OR has_function_privilege('authenticated','automation_private.on_sla_event()','EXECUTE')
 OR has_table_privilege('authenticated','automation_private.sla_events','SELECT') THEN RAISE EXCEPTION 'Private worker exposed'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','27000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  UPDATE public.automation_rules SET activated_at=now()-interval '1 year' WHERE id='37000000-0000-0000-0000-000000000002';
  RAISE EXCEPTION 'Client backdated activation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.set_automation_rule_active('17000000-0000-0000-0000-000000000001','37000000-0000-0000-0000-000000000001',true);
SELECT public.set_automation_rule_active('17000000-0000-0000-0000-000000000001','37000000-0000-0000-0000-000000000002',true);
SELECT public.set_automation_rule_active('17000000-0000-0000-0000-000000000001','37000000-0000-0000-0000-000000000003',true);
SELECT public.set_automation_rule_active('17000000-0000-0000-0000-000000000001','37000000-0000-0000-0000-000000000004',true);
RESET ROLE;
INSERT INTO public.candidates(id,user_id,company_id,job_id,name,email,stage) VALUES
 ('57000000-0000-0000-0000-000000000003','27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001','Current','current@example.test','waiting');
INSERT INTO public.job_offers(id,user_id,company_id,candidate_id,job_id,position,salary,status) VALUES
 ('77000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','57000000-0000-0000-0000-000000000003','47000000-0000-0000-0000-000000000001','Test',100,'draft'),
 ('77000000-0000-0000-0000-000000000002','27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','57000000-0000-0000-0000-000000000002',NULL,'Mismatch',100,'draft');
UPDATE public.job_offers SET status='sent',sent_at=clock_timestamp() WHERE id='77000000-0000-0000-0000-000000000001';
UPDATE public.job_offers SET sent_at=clock_timestamp() WHERE id='77000000-0000-0000-0000-000000000001';
UPDATE public.job_offers SET status='sent',sent_at=clock_timestamp() WHERE id='77000000-0000-0000-0000-000000000002';
DO $$ DECLARE entered timestamptz; BEGIN
 IF (SELECT count(*) FROM public.automation_logs WHERE entity_id='77000000-0000-0000-0000-000000000001' AND status='success') <> 1 THEN RAISE EXCEPTION 'Offer missing or duplicated'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.automation_logs WHERE entity_id='77000000-0000-0000-0000-000000000002' AND status='failed' AND execution_details->>'code'='offer_candidate_mismatch') THEN RAISE EXCEPTION 'Foreign offer accepted'; END IF;
 IF EXISTS (SELECT 1 FROM public.candidate_reviewer_assignments WHERE candidate_id='57000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Foreign candidate assigned'; END IF;
 SELECT stage_entered_at INTO entered FROM public.candidates WHERE id='57000000-0000-0000-0000-000000000003';
 IF automation_private.process_sla_expirations(entered+interval '2 hours'-interval '1 microsecond') <> 0 THEN RAISE EXCEPTION 'SLA early'; END IF;
 IF automation_private.process_sla_expirations(entered+interval '2 hours') <> 1 THEN RAISE EXCEPTION 'SLA missed deadline'; END IF;
 IF automation_private.process_sla_expirations(entered+interval '3 hours') <> 0 THEN RAISE EXCEPTION 'SLA repeated'; END IF;
 IF (SELECT stage FROM public.candidates WHERE id='57000000-0000-0000-0000-000000000003') <> 'reviewed' THEN RAISE EXCEPTION 'SLA move failed'; END IF;
 IF EXISTS (SELECT 1 FROM public.automation_logs WHERE rule_id IN ('37000000-0000-0000-0000-000000000003','37000000-0000-0000-0000-000000000004')) THEN RAISE EXCEPTION 'Old-stage or chained rule ran'; END IF;
 IF EXISTS (SELECT 1 FROM public.automation_logs WHERE trigger_event='sla.expired' AND entity_id IN ('57000000-0000-0000-0000-000000000001','57000000-0000-0000-0000-000000000002')) THEN RAISE EXCEPTION 'Historical or foreign entry ran'; END IF;
 UPDATE public.candidates SET stage_entered_at=now()-interval '1 month' WHERE id='57000000-0000-0000-0000-000000000003';
 IF (SELECT stage_entered_at FROM public.candidates WHERE id='57000000-0000-0000-0000-000000000003') <= entered THEN RAISE EXCEPTION 'Clock backdated'; END IF;
END $$;
ROLLBACK;
