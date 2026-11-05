ALTER TABLE public.assessment_responses ADD COLUMN passing_score_snapshot integer CHECK(passing_score_snapshot BETWEEN 0 AND 100);
-- A candidate's private tracking code binds an attempt to a real application.
-- Answer keys, attempt capabilities and immutable marking snapshots are never exposed as table data.
CREATE TABLE hiring_private.assessment_attempts (
 response_id uuid PRIMARY KEY REFERENCES public.assessment_responses(id) ON DELETE CASCADE,
 assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
 candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
 company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 access_token uuid NOT NULL DEFAULT gen_random_uuid(),
 expires_at timestamptz NOT NULL,
 snapshot jsonb NOT NULL,
 public_questions jsonb NOT NULL,
 saved_answers jsonb NOT NULL DEFAULT '[]',
 revision integer NOT NULL DEFAULT 0,
 timed_out boolean NOT NULL DEFAULT false,
 grade_claim uuid,
 grade_claim_until timestamptz,
 grade_attempts integer NOT NULL DEFAULT 0,
 passing_score integer NOT NULL,
 UNIQUE(assessment_id,candidate_id)
);
ALTER TABLE hiring_private.assessment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON hiring_private.assessment_attempts FROM PUBLIC,anon,authenticated;
GRANT ALL ON hiring_private.assessment_attempts TO service_role;
CREATE INDEX assessment_attempt_company ON hiring_private.assessment_attempts(company_id);
CREATE INDEX assessment_attempt_candidate ON hiring_private.assessment_attempts(candidate_id);

-- Retire capability-free submission and browser-provided grading APIs.
REVOKE EXECUTE ON FUNCTION public.start_assessment_response(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_assessment_response(uuid,jsonb,integer,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_ai_evaluations(uuid,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_assessment_for_candidate(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT jsonb_build_object('assessment',jsonb_build_object(
 'id',a.id,'title',a.title,'description',a.description,'duration_minutes',a.duration_minutes,
 'passing_score',a.passing_score,'is_randomized',a.is_randomized,
 'question_count',(SELECT count(*) FROM public.assessment_questions aq JOIN public.question_bank q ON q.id=aq.question_id AND q.company_id=a.company_id AND q.is_active WHERE aq.assessment_id=a.id)))
 FROM public.assessments a JOIN public.companies c ON c.id=a.company_id AND c.status='active'
 WHERE a.token=_token AND a.is_active),'{}'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.get_assessment_for_candidate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assessment_for_candidate(text) TO anon,authenticated;

CREATE FUNCTION public.begin_assessment_attempt(_token text,_tracking_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.assessments%ROWTYPE; c public.candidates%ROWTYPE; s hiring_private.assessment_attempts%ROWTYPE;
 q jsonb; opt jsonb; snap jsonb; visible jsonb:='[]'; opts jsonb; choices jsonb; rid uuid;
BEGIN
 IF coalesce(upper(btrim(_tracking_code)),'') !~ '^TX-[0-9A-F]{32}$' THEN RAISE EXCEPTION 'Invalid assessment access' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.assessments WHERE token=_token AND is_active FOR SHARE;
 IF NOT FOUND OR a.company_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.companies WHERE id=a.company_id AND status='active') THEN RAISE EXCEPTION 'Assessment unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.candidates WHERE tracking_code=upper(btrim(_tracking_code)) AND company_id=a.company_id AND (a.job_id IS NULL OR job_id=a.job_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid assessment access' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text||c.id::text,0));
 SELECT * INTO s FROM hiring_private.assessment_attempts WHERE assessment_id=a.id AND candidate_id=c.id;
 IF NOT FOUND THEN
  IF a.duration_minutes NOT BETWEEN 1 AND 480 OR a.passing_score NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid assessment settings'; END IF;
  SELECT jsonb_agg(jsonb_build_object('id',q.id,'question_text',q.question_text,'question_type',q.question_type,
   'code_language',q.code_language,'correct_answer',q.correct_answer,'points',coalesce(aq.points_override,q.points),
   'options',coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'option_text',o.option_text,'is_correct',o.is_correct) ORDER BY o.sort_order,o.id) FROM public.question_options o WHERE o.question_id=q.id),'[]'))
   ORDER BY CASE WHEN a.is_randomized THEN random() ELSE aq.sort_order::float END,aq.id) INTO snap
  FROM public.assessment_questions aq JOIN public.question_bank q ON q.id=aq.question_id AND q.company_id=a.company_id
  WHERE aq.assessment_id=a.id AND q.is_active;
  IF snap IS NULL OR jsonb_array_length(snap)=0 OR jsonb_array_length(snap)>200 THEN RAISE EXCEPTION 'Assessment has no valid questions'; END IF;
  FOR q IN SELECT value FROM jsonb_array_elements(snap) LOOP
   IF (q->>'points')::integer NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid question points'; END IF;
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',o->>'id','option_text',CASE WHEN q->>'question_type'='matching' THEN split_part(o->>'option_text','||',1) ELSE o->>'option_text' END) ORDER BY random()),'[]') INTO opts FROM jsonb_array_elements(q->'options') o;
   SELECT coalesce(jsonb_agg(to_jsonb(split_part(o->>'option_text','||',2)) ORDER BY random()),'[]') INTO choices FROM jsonb_array_elements(q->'options') o;
   visible:=visible||jsonb_build_array((q-'correct_answer'-'options')||jsonb_build_object('options',opts,'matching_choices',CASE WHEN q->>'question_type'='matching' THEN choices ELSE '[]'::jsonb END));
  END LOOP;
  INSERT INTO public.assessment_responses(assessment_id,candidate_id,candidate_name,candidate_email,status,answers,passing_score_snapshot)
   VALUES(a.id,c.id,c.name,c.email,'in_progress','[]',a.passing_score) RETURNING id INTO rid;
  INSERT INTO hiring_private.assessment_attempts(response_id,assessment_id,candidate_id,company_id,expires_at,snapshot,public_questions,passing_score)
   VALUES(rid,a.id,c.id,a.company_id,clock_timestamp()+make_interval(mins=>a.duration_minutes),snap,visible,a.passing_score) RETURNING * INTO s;
 END IF;
 RETURN jsonb_build_object('response_id',s.response_id,'access_token',s.access_token,'expires_at',s.expires_at,
  'server_time',clock_timestamp(),'questions',s.public_questions,'answers',s.saved_answers,'revision',s.revision,
  'status',(SELECT status FROM public.assessment_responses WHERE id=s.response_id),'candidate_name',c.name);
END $$;
REVOKE ALL ON FUNCTION public.begin_assessment_attempt(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_assessment_attempt(text,text) TO anon,authenticated;

CREATE FUNCTION hiring_private.validate_answers(_snapshot jsonb,_answers jsonb)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF _answers IS NULL OR jsonb_typeof(_answers)<>'array' OR octet_length(_answers::text)>250000
  OR jsonb_array_length(_answers)>200 THEN RAISE EXCEPTION 'Invalid answers'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_answers) v WHERE jsonb_typeof(v)<>'object'
   OR jsonb_typeof(v->'answer') IS DISTINCT FROM 'string' OR length(v->>'answer')>20000
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(_snapshot) q WHERE q->>'id'=v->>'question_id'))
  OR (SELECT count(*)<>count(DISTINCT v->>'question_id') FROM jsonb_array_elements(_answers) v)
 THEN RAISE EXCEPTION 'Invalid answer question'; END IF;
END $$;
REVOKE ALL ON FUNCTION hiring_private.validate_answers(jsonb,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.save_assessment_attempt(_response_id uuid,_access_token uuid,_answers jsonb,_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s hiring_private.assessment_attempts%ROWTYPE;
BEGIN
 SELECT * INTO s FROM hiring_private.assessment_attempts WHERE response_id=_response_id AND access_token=_access_token FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid attempt access' USING ERRCODE='42501'; END IF;
 IF clock_timestamp()>=s.expires_at OR (SELECT status FROM public.assessment_responses WHERE id=s.response_id)<>'in_progress' THEN RETURN jsonb_build_object('saved',false,'expired',true); END IF;
 PERFORM hiring_private.validate_answers(s.snapshot,_answers);
 IF _revision>s.revision THEN
  UPDATE hiring_private.assessment_attempts SET saved_answers=_answers,revision=_revision WHERE response_id=s.response_id;
 END IF;
 RETURN jsonb_build_object('saved',true,'revision',greatest(_revision,s.revision));
END $$;
REVOKE ALL ON FUNCTION public.save_assessment_attempt(uuid,uuid,jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_assessment_attempt(uuid,uuid,jsonb,integer) TO anon,authenticated;

CREATE FUNCTION hiring_private.attempt_result(_response_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('response_id',r.id,'status',r.status,'total_score',r.total_score,'max_score',r.max_score,
 'percentage',r.percentage,'passed',r.status='completed' AND r.percentage>=s.passing_score,'timed_out',s.timed_out)
 FROM public.assessment_responses r JOIN hiring_private.assessment_attempts s ON s.response_id=r.id WHERE r.id=_response_id
$$;
REVOKE ALL ON FUNCTION hiring_private.attempt_result(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.finish_assessment_attempt(_response_id uuid,_access_token uuid,_answers jsonb,_tab_switches integer DEFAULT 0,_tab_switch_log jsonb DEFAULT '[]')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s hiring_private.assessment_attempts%ROWTYPE; q jsonb; o jsonb; ans text; parsed jsonb; ok boolean; pts integer;
 answers_out jsonb:='[]'; total integer:=0; maximum integer:=0; pending boolean:=false; answer_list jsonb; expected jsonb;
BEGIN
 SELECT * INTO s FROM hiring_private.assessment_attempts WHERE response_id=_response_id AND access_token=_access_token FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid attempt access' USING ERRCODE='42501'; END IF;
 IF (SELECT status FROM public.assessment_responses WHERE id=s.response_id)<>'in_progress' THEN RETURN hiring_private.attempt_result(s.response_id); END IF;
 -- Late request bodies are discarded; only answers saved before the server deadline are graded.
 IF clock_timestamp()>=s.expires_at THEN answer_list:=s.saved_answers;
  UPDATE hiring_private.assessment_attempts SET timed_out=true WHERE response_id=s.response_id;
 ELSE PERFORM hiring_private.validate_answers(s.snapshot,_answers); answer_list:=_answers;
  UPDATE hiring_private.assessment_attempts SET saved_answers=answer_list WHERE response_id=s.response_id;
 END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(s.snapshot) LOOP
  SELECT v->>'answer' INTO ans FROM jsonb_array_elements(answer_list) v WHERE v->>'question_id'=q->>'id';
  ans:=coalesce(ans,'');ok:=false;pts:=(q->>'points')::integer;maximum:=maximum+pts;
  IF q->>'question_type'='multiple_choice' THEN
   ok:=EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') v WHERE v->>'id'=ans AND (v->>'is_correct')::boolean);
  ELSIF q->>'question_type'='true_false' THEN ok:=ans<>'' AND ans=q->>'correct_answer';
  ELSIF q->>'question_type' IN ('matching','ordering') THEN
   BEGIN parsed:=ans::jsonb; EXCEPTION WHEN OTHERS THEN parsed:=NULL; END;
   IF q->>'question_type'='matching' AND jsonb_typeof(parsed)='object' THEN
    ok:=jsonb_array_length(q->'options')>0;
    FOR o IN SELECT value FROM jsonb_array_elements(q->'options') LOOP
     ok:=ok AND coalesce(parsed->>(o->>'id')=split_part(o->>'option_text','||',2),false);
    END LOOP;
   ELSIF q->>'question_type'='ordering' AND jsonb_typeof(parsed)='array' THEN
    SELECT jsonb_agg(v->'option_text' ORDER BY n) INTO expected FROM jsonb_array_elements(q->'options') WITH ORDINALITY o(v,n);
    ok:=jsonb_array_length(q->'options')>0 AND parsed=expected;
   END IF;
  ELSIF q->>'question_type' IN ('open_ended','code') AND btrim(ans)<>'' THEN pending:=true;
  END IF;
  pts:=CASE WHEN coalesce(ok,false) THEN pts ELSE 0 END;total:=total+pts;
  answers_out:=answers_out||jsonb_build_array(jsonb_build_object('question_id',q->>'id','answer',ans,'is_correct',coalesce(ok,false),
   'points_earned',pts,'max_points',(q->>'points')::integer,'ai_evaluated',false,'requires_review',q->>'question_type' IN ('open_ended','code') AND btrim(ans)<>''));
 END LOOP;
 UPDATE public.assessment_responses SET answers=answers_out,total_score=total,max_score=maximum,
  percentage=CASE WHEN maximum>0 THEN round(total::numeric/maximum*100) ELSE 0 END,
  status=CASE WHEN pending THEN 'pending_review' ELSE 'completed' END,completed_at=clock_timestamp(),
  tab_switches=greatest(0,least(coalesce(_tab_switches,0),10000)),
  tab_switch_log=CASE WHEN octet_length(_tab_switch_log::text)<=100000 THEN _tab_switch_log ELSE '[]'::jsonb END WHERE id=s.response_id;
 RETURN hiring_private.attempt_result(s.response_id);
END $$;
REVOKE ALL ON FUNCTION public.finish_assessment_attempt(uuid,uuid,jsonb,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_assessment_attempt(uuid,uuid,jsonb,integer,jsonb) TO anon,authenticated;

CREATE FUNCTION public.claim_assessment_grading(_response_id uuid,_access_token uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s hiring_private.assessment_attempts%ROWTYPE; questions jsonb; claim uuid:=gen_random_uuid();
BEGIN
 SELECT * INTO s FROM hiring_private.assessment_attempts WHERE response_id=_response_id FOR UPDATE;
 IF NOT FOUND OR (_access_token IS NOT NULL AND s.access_token<>_access_token) THEN RAISE EXCEPTION 'Invalid attempt access' USING ERRCODE='42501'; END IF;
 IF (SELECT status FROM public.assessment_responses WHERE id=s.response_id)<>'pending_review' THEN RETURN jsonb_build_object('result',hiring_private.attempt_result(s.response_id)); END IF;
 IF s.grade_claim_until>clock_timestamp() OR s.grade_attempts>=5 THEN RETURN jsonb_build_object('result',hiring_private.attempt_result(s.response_id)); END IF;
 SELECT jsonb_agg(q||jsonb_build_object('answer',a->>'answer') ORDER BY n) INTO questions
 FROM jsonb_array_elements(s.snapshot) WITH ORDINALITY x(q,n)
 JOIN public.assessment_responses r ON r.id=s.response_id
 CROSS JOIN LATERAL jsonb_array_elements(r.answers) a
 WHERE q->>'id'=a->>'question_id' AND (a->>'requires_review')::boolean;
 UPDATE hiring_private.assessment_attempts SET grade_claim=claim,grade_claim_until=clock_timestamp()+interval '2 minutes',grade_attempts=grade_attempts+1 WHERE response_id=s.response_id;
 RETURN jsonb_build_object('claim',claim,'questions',questions);
END $$;
REVOKE ALL ON FUNCTION public.claim_assessment_grading(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_assessment_grading(uuid,uuid) TO service_role;

CREATE FUNCTION public.complete_assessment_grading(_response_id uuid,_claim uuid,_evaluations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s hiring_private.assessment_attempts%ROWTYPE; r public.assessment_responses%ROWTYPE; a jsonb; ev jsonb; graded jsonb:='[]'; total integer:=0; pts integer;
BEGIN
 SELECT * INTO s FROM hiring_private.assessment_attempts WHERE response_id=_response_id FOR UPDATE;
 IF NOT FOUND OR s.grade_claim IS DISTINCT FROM _claim THEN RAISE EXCEPTION 'Invalid grading claim' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.assessment_responses WHERE id=s.response_id;
 IF r.status<>'pending_review' THEN RETURN hiring_private.attempt_result(s.response_id); END IF;
 IF _evaluations IS NULL THEN UPDATE hiring_private.assessment_attempts SET grade_claim=NULL,grade_claim_until=NULL WHERE response_id=s.response_id; RETURN hiring_private.attempt_result(s.response_id); END IF;
 IF jsonb_typeof(_evaluations)<>'array' OR jsonb_array_length(_evaluations)<>(SELECT count(*) FROM jsonb_array_elements(r.answers) v WHERE (v->>'requires_review')::boolean)
   OR (SELECT count(*)<>count(DISTINCT v->>'question_id') FROM jsonb_array_elements(_evaluations) v) THEN RAISE EXCEPTION 'Incomplete grading result'; END IF;
 FOR a IN SELECT value FROM jsonb_array_elements(r.answers) LOOP
  IF (a->>'requires_review')::boolean THEN
   SELECT value INTO ev FROM jsonb_array_elements(_evaluations) WHERE value->>'question_id'=a->>'question_id';
   IF ev IS NULL OR jsonb_typeof(ev->'score') IS DISTINCT FROM 'number' OR (ev->>'score')::numeric<0 OR (ev->>'score')::numeric>(a->>'max_points')::integer OR (ev->>'score')::numeric<>trunc((ev->>'score')::numeric) THEN RAISE EXCEPTION 'Invalid grading score'; END IF;
   pts:=(ev->>'score')::integer;
   a:=a||jsonb_build_object('points_earned',pts,'is_correct',pts=(a->>'max_points')::integer,'ai_evaluated',true,'requires_review',false,'ai_feedback',left(ev->>'feedback',4000),'ai_strengths',left(ev->>'strengths',2000),'ai_improvements',left(ev->>'improvements',2000));
  END IF;
  total:=total+(a->>'points_earned')::integer;graded:=graded||jsonb_build_array(a);
 END LOOP;
 UPDATE public.assessment_responses SET answers=graded,total_score=total,percentage=round(total::numeric/nullif(max_score,0)*100),status='completed' WHERE id=s.response_id;
 UPDATE hiring_private.assessment_attempts SET grade_claim=NULL,grade_claim_until=NULL WHERE response_id=s.response_id;
 RETURN hiring_private.attempt_result(s.response_id);
END $$;
REVOKE ALL ON FUNCTION public.complete_assessment_grading(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_assessment_grading(uuid,uuid,jsonb) TO service_role;

CREATE FUNCTION public.review_assessment_response(_response_id uuid,_evaluations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.assessment_responses%ROWTYPE; co uuid; a jsonb; ev jsonb; q jsonb; snapshot jsonb; maximum integer:=0; total integer:=0; points integer; output jsonb:='[]';
BEGIN
 SELECT company_id INTO co FROM public.assessments WHERE id=(SELECT assessment_id FROM public.assessment_responses WHERE id=_response_id);
 IF NOT hiring_private.allowed(co,'assessment_responses','edit') THEN RAISE EXCEPTION 'Review permission required' USING ERRCODE='42501'; END IF;
 -- Lock in the same order as automatic grading; human review wins over a later AI callback.
 SELECT s.snapshot INTO snapshot FROM hiring_private.assessment_attempts s WHERE s.response_id=_response_id FOR UPDATE;
 SELECT * INTO r FROM public.assessment_responses WHERE id=_response_id FOR UPDATE;
 IF NOT FOUND OR r.status NOT IN ('completed','pending_review') THEN RAISE EXCEPTION 'Response unavailable for review'; END IF;
 IF snapshot IS NULL THEN
  SELECT jsonb_agg(jsonb_build_object('id',q.id,'points',coalesce(aq.points_override,q.points))) INTO snapshot
   FROM public.assessment_questions aq JOIN public.question_bank q ON q.id=aq.question_id WHERE aq.assessment_id=r.assessment_id;
 END IF;
 IF _evaluations IS NULL OR jsonb_typeof(_evaluations)<>'array' OR jsonb_array_length(_evaluations)<>jsonb_array_length(r.answers)
 OR (SELECT count(*)<>count(DISTINCT v->>'question_id') FROM jsonb_array_elements(_evaluations) v) THEN RAISE EXCEPTION 'Review all answers'; END IF;
 FOR a IN SELECT value FROM jsonb_array_elements(r.answers) LOOP
  SELECT value INTO q FROM jsonb_array_elements(snapshot) WHERE value->>'id'=a->>'question_id';
  SELECT value INTO ev FROM jsonb_array_elements(_evaluations) WHERE value->>'question_id'=a->>'question_id';
  IF q IS NULL OR ev IS NULL OR jsonb_typeof(ev->'score') IS DISTINCT FROM 'number' OR (ev->>'score')::numeric NOT BETWEEN 0 AND (q->>'points')::integer OR (ev->>'score')::numeric<>trunc((ev->>'score')::numeric) THEN RAISE EXCEPTION 'Invalid review score'; END IF;
  points:=(ev->>'score')::integer;maximum:=maximum+(q->>'points')::integer;total:=total+points;
  output:=output||jsonb_build_array(a||jsonb_build_object('points_earned',points,'is_correct',points=(q->>'points')::integer,'max_points',(q->>'points')::integer,'requires_review',false,'reviewed_by',auth.uid(),'reviewed_at',clock_timestamp(),'ai_feedback',left(ev->>'feedback',4000),'ai_strengths',left(ev->>'strengths',2000),'ai_improvements',left(ev->>'improvements',2000)));
 END LOOP;
 UPDATE public.assessment_responses SET answers=output,total_score=total,max_score=maximum,percentage=round(total::numeric/nullif(maximum,0)*100),status='completed' WHERE id=r.id;
 RETURN jsonb_build_object('total_score',total,'max_score',maximum,'percentage',round(total::numeric/nullif(maximum,0)*100),'status','completed');
END $$;
REVOKE ALL ON FUNCTION public.review_assessment_response(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_assessment_response(uuid,jsonb) TO authenticated;

-- Result delivery cannot accept a browser-supplied recipient or score.
CREATE FUNCTION public.get_assessment_result_delivery(_response_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.assessment_responses%ROWTYPE; a public.assessments%ROWTYPE; c public.candidates%ROWTYPE;
 s hiring_private.assessment_attempts%ROWTYPE; details jsonb;
BEGIN
 SELECT * INTO r FROM public.assessment_responses WHERE id=_response_id;
 SELECT * INTO a FROM public.assessments WHERE id=r.assessment_id;
 IF NOT hiring_private.allowed(a.company_id,'assessment_responses','edit') OR r.status IS DISTINCT FROM 'completed'
 THEN RAISE EXCEPTION 'Completed response and review permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.candidates WHERE id=r.candidate_id AND company_id=a.company_id;
 IF NOT FOUND OR nullif(btrim(c.email),'') IS NULL THEN RAISE EXCEPTION 'Linked candidate required' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM hiring_private.assessment_attempts WHERE response_id=r.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('question_text',coalesce(snap.q->>'question_text',q.question_text,'سؤال'),
  'points_earned',(v->>'points_earned')::integer,'max_points',coalesce((v->>'max_points')::integer,(snap.q->>'points')::integer,aq.points_override,q.points,0),
  'feedback',v->>'ai_feedback') ORDER BY n),'[]') INTO details
 FROM jsonb_array_elements(r.answers) WITH ORDINALITY ans(v,n)
 LEFT JOIN public.question_bank q ON q.id=(v->>'question_id')::uuid AND q.company_id=a.company_id
 LEFT JOIN public.assessment_questions aq ON aq.assessment_id=a.id AND aq.question_id=q.id
 LEFT JOIN LATERAL (SELECT value q FROM jsonb_array_elements(s.snapshot) WHERE value->>'id'=v->>'question_id') snap ON true;
 RETURN jsonb_build_object('candidate_name',c.name,'candidate_email',c.email,'title',a.title,
 'total_score',r.total_score,'max_score',r.max_score,'passing_score',coalesce(s.passing_score,a.passing_score),'answers',details);
END $$;
REVOKE ALL ON FUNCTION public.get_assessment_result_delivery(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_assessment_result_delivery(uuid) TO authenticated;

CREATE FUNCTION public.get_assessment_review_questions(_response_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE co uuid; assessment uuid; questions jsonb;
BEGIN
 SELECT a.company_id,a.id INTO co,assessment FROM public.assessment_responses r JOIN public.assessments a ON a.id=r.assessment_id WHERE r.id=_response_id;
 IF NOT hiring_private.allowed(co,'assessment_responses','read') THEN RAISE EXCEPTION 'Response permission required' USING ERRCODE='42501'; END IF;
 SELECT public_questions INTO questions FROM hiring_private.assessment_attempts WHERE response_id=_response_id;
 IF questions IS NOT NULL THEN RETURN questions; END IF;
 -- Legacy attempts predate snapshots. Use available bank text without inventing
 -- missing historical questions or disclosing reference answers.
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',v->>'question_id','question_text',coalesce(q.question_text,'نص السؤال القديم غير متاح'),
  'question_type',q.question_type,'points',coalesce((v->>'max_points')::integer,aq.points_override,q.points,0),
  'options',coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'option_text',CASE WHEN q.question_type::text='matching' THEN split_part(o.option_text,'||',1) ELSE o.option_text END)) FROM public.question_options o WHERE o.question_id=q.id),'[]')) ORDER BY n),'[]') INTO questions
 FROM public.assessment_responses r CROSS JOIN LATERAL jsonb_array_elements(r.answers) WITH ORDINALITY ans(v,n)
 LEFT JOIN public.question_bank q ON q.id=(v->>'question_id')::uuid AND q.company_id=co
 LEFT JOIN public.assessment_questions aq ON aq.assessment_id=assessment AND aq.question_id=q.id
 WHERE r.id=_response_id;
 RETURN questions;
END $$;
REVOKE ALL ON FUNCTION public.get_assessment_review_questions(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_assessment_review_questions(uuid) TO authenticated;
