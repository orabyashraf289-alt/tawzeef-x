-- Run against disposable migration replay database only. Every fixture rolls back.
BEGIN;
SET LOCAL session_replication_role=replica;
INSERT INTO auth.users(id,email,raw_user_meta_data)
SELECT ('46000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'review-'||i||'@example.test','{}'::jsonb FROM generate_series(1,10) i;
SET LOCAL session_replication_role=origin;
INSERT INTO public.companies(id,name,owner_user_id,status) VALUES
 ('46100000-0000-0000-0000-000000000001','Review test A','46000000-0000-0000-0000-000000000001','active'),
 ('46100000-0000-0000-0000-000000000002','Review test B','46000000-0000-0000-0000-000000000009','active');
INSERT INTO public.company_members(company_id,user_id,member_role)
SELECT CASE WHEN i IN (7,9) THEN '46100000-0000-0000-0000-000000000002'::uuid ELSE '46100000-0000-0000-0000-000000000001'::uuid END,
 ('46000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,CASE WHEN i IN (1,9) THEN 'owner' ELSE 'viewer' END FROM generate_series(1,10) i
ON CONFLICT(company_id,user_id) DO UPDATE SET member_role=excluded.member_role;

CREATE FUNCTION pg_temp.expect_denied(co uuid,op text,p jsonb) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN PERFORM public.performance360(co,op,p); RETURN false; EXCEPTION WHEN OTHERS THEN RETURN true; END $$;
CREATE FUNCTION pg_temp.expect(ok boolean,msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '360 test: %',msg; END IF; END $$;

DO $$
DECLARE co uuid:='46100000-0000-0000-0000-000000000001'; c uuid; c2 uuid; result jsonb; payload jsonb; roster jsonb; aid uuid;
 u uuid; n integer; initial jsonb; specs jsonb:='[{"id":"a","title":"Delivery","description":"Observed delivery","weight":50},{"id":"b","title":"Teamwork","description":"Observed teamwork","weight":30},{"id":"c","title":"Communication","description":"Observed communication","weight":20}]';
BEGIN
 PERFORM pg_temp.expect(NOT has_table_privilege('authenticated','evaluation_private.responses','SELECT'),'raw responses must have no client access');
 PERFORM pg_temp.expect(NOT has_table_privilege('authenticated','evaluation_private.assignments','UPDATE'),'assignment writes must use authorization gateway');
 PERFORM pg_temp.expect(NOT has_function_privilege('anon','public.performance360(uuid,text,jsonb)','EXECUTE'),'anonymous RPC denied');
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000001',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 payload:=jsonb_build_object('subject_id','46000000-0000-0000-0000-000000000002','title','Private cycle','period_start',current_date-30,'period_end',current_date,
 'deadline',now()+interval '7 days','criteria',specs);
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'create',jsonb_set(payload,'{criteria,0,weight}','40')),'invalid weights accepted');
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'create',payload||'{"subject_id":"46000000-0000-0000-0000-000000000007"}'),'cross-company subject accepted');
 c:=(public.performance360(co,'create',payload)->>'id')::uuid;
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'open',jsonb_build_object('cycle_id',c)),'self-only cycle opened');
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'assign',jsonb_build_object('cycle_id',c,'reviewer_id','46000000-0000-0000-0000-000000000007','relationship','peers')),'cross-company reviewer accepted');
 PERFORM public.performance360(co,'assign',jsonb_build_object('cycle_id',c,'reviewer_id','46000000-0000-0000-0000-000000000003','relationship','manager'));
 FOR n IN 4..5 LOOP
  PERFORM public.performance360(co,'assign',jsonb_build_object('cycle_id',c,'reviewer_id',('46000000-0000-0000-0000-'||lpad(n::text,12,'0')),'relationship','peers'));
 END LOOP;
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'open',jsonb_build_object('cycle_id',c)),'two-person confidential group opened');
 PERFORM public.performance360(co,'assign',jsonb_build_object('cycle_id',c,'reviewer_id','46000000-0000-0000-0000-000000000006','relationship','peers'));
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'assign',jsonb_build_object('cycle_id',c,'reviewer_id','46000000-0000-0000-0000-000000000004','relationship','subordinates')),'duplicate reviewer accepted');
 PERFORM public.performance360(co,'open',jsonb_build_object('cycle_id',c));
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'remove',jsonb_build_object('cycle_id',c,'reviewer_id','46000000-0000-0000-0000-000000000004')),'open roster changed');
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'report',jsonb_build_object('cycle_id',c)),'live aggregate leaked');
 roster:=public.performance360(co,'roster',jsonb_build_object('cycle_id',c));
 PERFORM pg_temp.expect(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(roster) x WHERE x ? 'submitted' OR x ? 'scores' OR x ? 'submitted_at'),'roster leaks response state');
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000009',true);
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'list','{}'),'other company admin reads cycles');
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000008',true);
 PERFORM pg_temp.expect(jsonb_array_length(public.performance360(co,'list','{}')->'cycles')=0,'uninvolved member sees cycles');
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'create',payload),'viewer creates cycle');
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'roster',jsonb_build_object('cycle_id',c)),'viewer reads roster');
 FOR n IN 2..6 LOOP
  PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-'||lpad(n::text,12,'0'),true);
  result:=public.performance360(co,'list','{}');
  PERFORM pg_temp.expect(jsonb_array_length(result->'tasks')=1,'participant cannot find own assignment');
  PERFORM pg_temp.expect(jsonb_array_length(result->'members')=0,'participant sees directory');
  aid:=((result->'tasks')->0->>'id')::uuid;
  PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',gen_random_uuid(),'scores','{"a":3,"b":3,"c":3}'::jsonb)),'forged assignment accepted');
  PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',aid,'scores','{"a":6,"b":3,"c":3}'::jsonb)),'out of range score accepted');
  PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',aid,'scores','{}'::jsonb)),'empty questionnaire accepted');
  PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',aid,'scores','{"a":"3","b":3,"c":3}'::jsonb)),'string score accepted');
  PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',aid,'scores','{"a":3,"b":3}'::jsonb)),'missing criterion accepted');
  PERFORM public.performance360(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',aid,'scores',
   CASE WHEN n=2 THEN '{"a":5,"b":5,"c":5}'::jsonb WHEN n=3 THEN '{"a":2,"b":4,"c":null}'::jsonb
        WHEN n=6 THEN '{"a":4,"b":null,"c":null}'::jsonb ELSE '{"a":4,"b":2,"c":null}'::jsonb END));
  PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',aid,'scores','{"a":3,"b":3,"c":3}'::jsonb)),'duplicate response accepted');
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000001',true);
 PERFORM public.performance360(co,'close',jsonb_build_object('cycle_id',c));
 result:=public.performance360(co,'report',jsonb_build_object('cycle_id',c));initial:=result;
 PERFORM pg_temp.expect((result->>'overall')::numeric=3.375,'wrong weighted mean or self included');
 PERFORM pg_temp.expect((result->>'available_weight')::numeric=80,'missing dimensions counted as zero');
 PERFORM pg_temp.expect(result->'criteria'->0->'groups'->'peers'='4'::jsonb,'three valid peers must aggregate');
 PERFORM pg_temp.expect(result->'criteria'->1->'groups'->'peers'='null'::jsonb,'two valid peers must be suppressed per criterion');
 PERFORM pg_temp.expect(result->'criteria'->2->'external'='null'::jsonb,'unobserved criterion fabricated');
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'open',jsonb_build_object('cycle_id',c)),'closed cycle reopened');
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000004',true);
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'report',jsonb_build_object('cycle_id',c)),'peer reads another person report');
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c,'assignment_id',aid,'scores','{"a":3,"b":3,"c":3}'::jsonb)),'closed cycle accepts response');
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000002',true);
 PERFORM pg_temp.expect(public.performance360(co,'report',jsonb_build_object('cycle_id',c))=initial,'subject cannot read frozen report');
 EXECUTE 'RESET ROLE';
 DELETE FROM public.company_members WHERE company_id=co AND user_id='46000000-0000-0000-0000-000000000004';
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM pg_temp.expect(public.performance360(co,'report',jsonb_build_object('cycle_id',c))=initial,'membership change alters frozen report');
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000004',true);
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'list','{}'),'removed participant retains access');
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000001',true);
 c2:=(public.performance360(co,'create',payload)->>'id')::uuid;
 PERFORM public.performance360(co,'assign',jsonb_build_object('cycle_id',c2,'reviewer_id','46000000-0000-0000-0000-000000000003','relationship','manager'));
 PERFORM public.performance360(co,'open',jsonb_build_object('cycle_id',c2));
 EXECUTE 'RESET ROLE';
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000002',true);
 SELECT (t->>'id')::uuid INTO aid FROM jsonb_array_elements(public.performance360(co,'list','{}')->'tasks') t WHERE t->>'cycle_id'=c2::text;
 PERFORM public.performance360(co,'submit',jsonb_build_object('cycle_id',c2,'assignment_id',aid,'scores','{"a":null,"b":null,"c":null}'::jsonb));
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000003',true);
 SELECT (t->>'id')::uuid INTO aid FROM jsonb_array_elements(public.performance360(co,'list','{}')->'tasks') t WHERE t->>'cycle_id'=c2::text;
 EXECUTE 'RESET ROLE';
 UPDATE evaluation_private.cycles SET deadline=now()-interval '1 second',period_end=current_date-1 WHERE id=c2;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub','46000000-0000-0000-0000-000000000003',true);
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'submit',jsonb_build_object('cycle_id',c2,'assignment_id',aid,'scores','{"a":3,"b":3,"c":3}'::jsonb)),'expired cycle accepts response');
 EXECUTE 'RESET ROLE';
 UPDATE public.companies SET status='suspended' WHERE id=co;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM pg_temp.expect(pg_temp.expect_denied(co,'list','{}'),'suspended company access');
 EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
