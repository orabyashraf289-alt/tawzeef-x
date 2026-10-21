-- Disposable branch-order and tenant-access checks; no fixture survives.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES
 ('a5000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','order-parent@example.test'),
 ('a5000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','order-other@example.test');
INSERT INTO public.companies (id,name) VALUES
 ('a5100000-0000-0000-0000-000000000001','Order parent'),
 ('a5100000-0000-0000-0000-000000000003','Other order tenant');
INSERT INTO public.companies (id,name,parent_company_id) VALUES
 ('a5100000-0000-0000-0000-000000000002','Order branch','a5100000-0000-0000-0000-000000000001');
INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
 ('a5100000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','owner'),
 ('a5100000-0000-0000-0000-000000000003','a5000000-0000-0000-0000-000000000002','owner');
INSERT INTO public.jobs (id,user_id,company_id,title,department,location,type) VALUES
 ('a5200000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','a5100000-0000-0000-0000-000000000002','Branch job','HR','Riyadh','full-time'),
 ('a5200000-0000-0000-0000-000000000002','a5000000-0000-0000-0000-000000000002','a5100000-0000-0000-0000-000000000003','Other job','HR','Riyadh','full-time');
INSERT INTO public.candidates (id,user_id,company_id,job_id,name,status) VALUES
 ('a5300000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','a5100000-0000-0000-0000-000000000002','a5200000-0000-0000-0000-000000000001','Order candidate','قيد المراجعة');
INSERT INTO public.job_offers (id,user_id,company_id,candidate_id,job_id,position,salary,status) VALUES
 ('a5400000-0000-0000-0000-000000000001','a5000000-0000-0000-0000-000000000001','a5100000-0000-0000-0000-000000000002','a5300000-0000-0000-0000-000000000001','a5200000-0000-0000-0000-000000000001','Branch job',1000,'accepted'),
 ('a5400000-0000-0000-0000-000000000002','a5000000-0000-0000-0000-000000000001','a5100000-0000-0000-0000-000000000002','a5300000-0000-0000-0000-000000000001','a5200000-0000-0000-0000-000000000001','Draft job',1000,'draft');
SET LOCAL session_replication_role = origin;

SELECT set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.converted_orders (
 company_id, offer_id, candidate_id, job_id, candidate_name, job_title,
 order_type, basic_salary, housing_allowance, transport_allowance
) VALUES (
 'a5100000-0000-0000-0000-000000000002','a5400000-0000-0000-0000-000000000001',
 'a5300000-0000-0000-0000-000000000001','a5200000-0000-0000-0000-000000000001',
 'Order candidate','Branch job','direct_hire',800,100,100
);
DO $$
DECLARE blocked boolean;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.converted_orders WHERE offer_id='a5400000-0000-0000-0000-000000000001'
   AND company_id='a5100000-0000-0000-0000-000000000002' AND total_salary=1000
   AND status='pending_documents' AND created_by_user_id=auth.uid() AND order_number LIKE 'ORD-%')
 THEN RAISE EXCEPTION 'Parent owner order was not persisted in branch'; END IF;
 blocked := false;
 BEGIN
   INSERT INTO public.converted_orders(company_id,offer_id,candidate_id,job_id,candidate_name,job_title,order_type)
   VALUES ('a5100000-0000-0000-0000-000000000002','a5400000-0000-0000-0000-000000000002',
    'a5300000-0000-0000-0000-000000000001','a5200000-0000-0000-0000-000000000001','X','Y','direct_hire');
 EXCEPTION WHEN raise_exception THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Draft offer was promoted to employment order'; END IF;
 blocked := false;
 BEGIN
   INSERT INTO public.converted_orders(company_id,candidate_id,job_id,candidate_name,job_title,order_type)
   VALUES ('a5100000-0000-0000-0000-000000000002','a5300000-0000-0000-0000-000000000001',
    'a5200000-0000-0000-0000-000000000002','X','Y','direct_hire');
 EXCEPTION WHEN foreign_key_violation THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Foreign tenant job linked to branch order'; END IF;
 blocked := false;
 BEGIN
   UPDATE public.converted_orders SET company_id='a5100000-0000-0000-0000-000000000001'
   WHERE offer_id='a5400000-0000-0000-0000-000000000001';
 EXCEPTION WHEN raise_exception THEN blocked := true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Order changed companies after creation'; END IF;
END $$;
RESET ROLE;

-- Existing candidate RLS traverses agency membership, which is not granted
-- to the client role in this replay. Inspect the unchanged status as test admin.
DO $$
BEGIN
 IF (SELECT status FROM public.candidates WHERE id='a5300000-0000-0000-0000-000000000001') <> 'قيد المراجعة'
 THEN RAISE EXCEPTION 'Creating order prematurely completed candidate'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','a5000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.converted_orders WHERE company_id='a5100000-0000-0000-0000-000000000002')
 THEN RAISE EXCEPTION 'Other company can see branch order'; END IF;
END $$;
RESET ROLE;
-- The bearer link exposes a minimal summary; a candidate acknowledgement is
-- persistent and idempotent, but does not approve the HR status or checklist.
SELECT set_config('test.order_onboarding_token',
  (SELECT onboarding_token::text FROM public.converted_orders
   WHERE offer_id='a5400000-0000-0000-0000-000000000001'), true);
DO $$
BEGIN
 IF has_table_privilege('anon', 'public.converted_orders', 'SELECT')
 THEN RAISE EXCEPTION 'Anonymous callers can read private employment orders'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$
DECLARE summary jsonb;
BEGIN
 SELECT public.get_order_onboarding(current_setting('test.order_onboarding_token')::uuid) INTO summary;
 IF summary->>'candidate_name' <> 'Order candidate' OR summary->>'status' <> 'pending_documents'
    OR summary ? 'candidate_national_id' OR summary ? 'onboarding_token'
 THEN RAISE EXCEPTION 'Candidate link exposed unexpected order fields'; END IF;
 IF public.get_order_onboarding('00000000-0000-0000-0000-000000000000') IS NOT NULL
 THEN RAISE EXCEPTION 'Unknown token resolved an order'; END IF;
 IF public.acknowledge_order_onboarding('00000000-0000-0000-0000-000000000000',
    'data:image/png;base64,iVBORw0KGgo' || repeat('A', 120))
 THEN RAISE EXCEPTION 'Unknown token acknowledged an order'; END IF;
 IF NOT public.acknowledge_order_onboarding(current_setting('test.order_onboarding_token')::uuid,
    'data:image/png;base64,iVBORw0KGgo' || repeat('A', 120))
 THEN RAISE EXCEPTION 'Valid token did not persist acknowledgement'; END IF;
 IF public.acknowledge_order_onboarding(current_setting('test.order_onboarding_token')::uuid,
    'data:image/png;base64,iVBORw0KGgo' || repeat('A', 120))
 THEN RAISE EXCEPTION 'Duplicate submission replaced acknowledgement'; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.converted_orders
   WHERE offer_id='a5400000-0000-0000-0000-000000000001'
   AND onboarding_acknowledged_at IS NOT NULL AND onboarding_signature IS NOT NULL
   AND status='pending_documents' AND documents_checklist->>'signed_contract' IS DISTINCT FROM 'true')
 THEN RAISE EXCEPTION 'Acknowledgement incorrectly approved order'; END IF;
END $$;
ROLLBACK;
