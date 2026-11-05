-- Operation permissions supplement existing tenant/agency policies; they never grant tenant access.
CREATE SCHEMA hiring_private;
REVOKE ALL ON SCHEMA hiring_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA hiring_private TO authenticated, service_role;

CREATE FUNCTION hiring_private.allowed(_company uuid, _module text, _action text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); member_role text; app_role text; p public.granular_permissions%ROWTYPE;
BEGIN
 IF actor IS NULL OR _company IS NULL OR _action IS NULL OR _module IS NULL OR _action NOT IN ('read','create','edit','delete')
   OR _module NOT IN ('jobs','candidates','interviews','offers','question_bank','assessment_responses')
   OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=now()))
 THEN RETURN false; END IF;
 IF public.is_super_admin(actor) THEN RETURN true; END IF;
 SELECT m.member_role INTO member_role FROM public.company_members m JOIN public.companies c ON c.id=_company
 WHERE c.status='active' AND m.user_id=actor AND m.company_id IN (c.id,c.parent_company_id)
 ORDER BY (m.company_id=c.id) DESC LIMIT 1;
 IF member_role IS NULL THEN RETURN false; END IF;
 app_role:=coalesce(public.get_user_role(actor)::text,'recruiter');
 IF app_role='job_seeker' THEN RETURN false; END IF;
 SELECT * INTO p FROM public.granular_permissions
 WHERE company_id=_company AND module_key=_module
 AND ((user_id=actor AND role_key='user:'||actor::text) OR (user_id IS NULL AND role_key=app_role))
 ORDER BY (user_id IS NOT NULL) DESC LIMIT 1;
 IF FOUND THEN
   RETURN p.can_read AND CASE _action WHEN 'read' THEN p.can_read WHEN 'create' THEN p.can_create WHEN 'edit' THEN p.can_edit ELSE p.can_delete END;
 END IF;
 RETURN _action='read' OR (member_role IN ('owner','admin')) OR
   (member_role='hr' AND app_role<>'reviewer' AND _action IN ('create','edit'));
END $$;
REVOKE ALL ON FUNCTION hiring_private.allowed(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION hiring_private.allowed(uuid,text,text) TO authenticated,service_role;

CREATE FUNCTION public.has_hiring_permission(_company uuid,_module text,_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT hiring_private.allowed(_company,_module,_action)
$$;
REVOKE ALL ON FUNCTION public.has_hiring_permission(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_hiring_permission(uuid,text,text) TO authenticated;

CREATE FUNCTION public.get_hiring_permissions(_company uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_object_agg(module,jsonb_build_object('read',hiring_private.allowed(_company,module,'read'),
  'create',hiring_private.allowed(_company,module,'create'),'edit',hiring_private.allowed(_company,module,'edit'),
  'delete',hiring_private.allowed(_company,module,'delete')))
 FROM unnest(ARRAY['jobs','candidates','interviews','offers','question_bank','assessment_responses']) module
$$;
REVOKE ALL ON FUNCTION public.get_hiring_permissions(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_hiring_permissions(uuid) TO authenticated;

DO $$ DECLARE t text; m text; BEGIN
 FOR t,m IN SELECT * FROM (VALUES ('jobs','jobs'),('candidates','candidates'),('interviews','interviews'),('job_offers','offers'),('question_bank','question_bank'),('assessments','question_bank')) x(t,m) LOOP
  EXECUTE format('CREATE POLICY hiring_create_guard ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (hiring_private.allowed(company_id,%L,''create''))',t,m);
  EXECUTE format('CREATE POLICY hiring_edit_guard ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (hiring_private.allowed(company_id,%L,''edit'')) WITH CHECK (hiring_private.allowed(company_id,%L,''edit''))',t,m,m);
  EXECUTE format('CREATE POLICY hiring_delete_guard ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (hiring_private.allowed(company_id,%L,''delete''))',t,m);
  -- Preserve existing public-job and agency-only read policies, but enforce an actual company member's read restriction.
  EXECUTE format('CREATE POLICY hiring_read_guard ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.has_company_access(company_id) OR hiring_private.allowed(company_id,%L,''read''))',t,m);
 END LOOP;
END $$;

-- Child records cannot bypass the permissions on their question/assessment.
CREATE POLICY hiring_option_guard ON public.question_options AS RESTRICTIVE FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.question_bank q WHERE q.id=question_id AND hiring_private.allowed(q.company_id,'question_bank','read')))
 WITH CHECK(EXISTS(SELECT 1 FROM public.question_bank q WHERE q.id=question_id AND hiring_private.allowed(q.company_id,'question_bank','edit')));
CREATE POLICY hiring_question_link_guard ON public.assessment_questions AS RESTRICTIVE FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.assessments a WHERE a.id=assessment_id AND hiring_private.allowed(a.company_id,'question_bank','read')))
 WITH CHECK(EXISTS(SELECT 1 FROM public.assessments a JOIN public.question_bank q ON q.company_id=a.company_id
  WHERE a.id=assessment_id AND q.id=question_id AND hiring_private.allowed(a.company_id,'question_bank','edit')));
CREATE POLICY hiring_option_delete_guard ON public.question_options AS RESTRICTIVE FOR DELETE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.question_bank q WHERE q.id=question_id AND hiring_private.allowed(q.company_id,'question_bank','edit')));
CREATE POLICY hiring_link_delete_guard ON public.assessment_questions AS RESTRICTIVE FOR DELETE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.assessments a WHERE a.id=assessment_id AND hiring_private.allowed(a.company_id,'question_bank','edit')));
CREATE POLICY hiring_option_edit_guard ON public.question_options AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.question_bank q WHERE q.id=question_id AND hiring_private.allowed(q.company_id,'question_bank','edit')));
CREATE POLICY hiring_link_edit_guard ON public.assessment_questions AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.assessments a WHERE a.id=assessment_id AND hiring_private.allowed(a.company_id,'question_bank','edit')));

-- Scores are never written directly by a browser, including the assessment owner.
REVOKE INSERT,UPDATE,DELETE ON public.assessment_responses FROM anon,authenticated;
CREATE POLICY hiring_response_read ON public.assessment_responses FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.assessments a WHERE a.id=assessment_id AND hiring_private.allowed(a.company_id,'assessment_responses','read')));
CREATE POLICY hiring_response_read_guard ON public.assessment_responses AS RESTRICTIVE FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.assessments a WHERE a.id=assessment_id AND hiring_private.allowed(a.company_id,'assessment_responses','read')));

-- Creation is one transaction, including child rows. A create-only user must not
-- need edit permission, and failures must not leave a half-created assessment.
CREATE FUNCTION public.create_question_bank_item(_company uuid,_kind text,_item jsonb,_children jsonb DEFAULT '[]')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.question_bank%ROWTYPE; a public.assessments%ROWTYPE; child jsonb; n integer:=0; target_job uuid;
BEGIN
 IF NOT hiring_private.allowed(_company,'question_bank','create') THEN RAISE EXCEPTION 'Create permission required' USING ERRCODE='42501'; END IF;
 IF _kind IS NULL OR _kind NOT IN ('question','assessment') OR _item IS NULL OR jsonb_typeof(_item)<>'object'
 OR _children IS NULL OR jsonb_typeof(_children)<>'array' OR jsonb_array_length(_children)>200
 OR octet_length(_item::text)>100000 OR octet_length(_children::text)>250000 THEN RAISE EXCEPTION 'Invalid item'; END IF;
 target_job:=nullif(_item->>'job_id','')::uuid;
 IF target_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=target_job AND company_id=_company)
 THEN RAISE EXCEPTION 'Job must belong to this company' USING ERRCODE='42501'; END IF;
 IF _kind='question' THEN
  SELECT * INTO q FROM jsonb_populate_record(NULL::public.question_bank,_item);
  IF nullif(btrim(q.question_text),'') IS NULL OR coalesce(q.points,1) NOT BETWEEN 1 AND 1000 OR jsonb_array_length(_children)>50
  THEN RAISE EXCEPTION 'Invalid question'; END IF;
  INSERT INTO public.question_bank(user_id,company_id,job_id,question_text,question_type,difficulty,category,correct_answer,explanation,code_language,time_limit_seconds,points,is_active)
   VALUES(auth.uid(),_company,target_job,q.question_text,coalesce(q.question_type,'multiple_choice'),coalesce(q.difficulty,'medium'),coalesce(q.category,''),q.correct_answer,q.explanation,q.code_language,q.time_limit_seconds,coalesce(q.points,1),coalesce(q.is_active,true)) RETURNING * INTO q;
  FOR child IN SELECT value FROM jsonb_array_elements(_children) LOOP
   IF nullif(btrim(child->>'option_text'),'') IS NULL THEN RAISE EXCEPTION 'Invalid option'; END IF;
   INSERT INTO public.question_options(question_id,option_text,is_correct,sort_order) VALUES(q.id,child->>'option_text',coalesce((child->>'is_correct')::boolean,false),n);
   n:=n+1;
  END LOOP;
  RETURN to_jsonb(q);
 END IF;
 SELECT * INTO a FROM jsonb_populate_record(NULL::public.assessments,_item);
 IF nullif(btrim(a.title),'') IS NULL OR coalesce(a.duration_minutes,60) NOT BETWEEN 1 AND 480 OR coalesce(a.passing_score,70) NOT BETWEEN 0 AND 100
 THEN RAISE EXCEPTION 'Invalid assessment'; END IF;
 INSERT INTO public.assessments(user_id,company_id,job_id,title,description,duration_minutes,passing_score,is_randomized,is_active)
  VALUES(auth.uid(),_company,target_job,a.title,a.description,coalesce(a.duration_minutes,60),coalesce(a.passing_score,70),coalesce(a.is_randomized,false),coalesce(a.is_active,true)) RETURNING * INTO a;
 FOR child IN SELECT value FROM jsonb_array_elements(_children) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.question_bank WHERE id=(child->>'question_id')::uuid AND company_id=_company)
   OR (child->>'points_override')::integer NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid linked question'; END IF;
  INSERT INTO public.assessment_questions(assessment_id,question_id,sort_order,points_override)
   VALUES(a.id,(child->>'question_id')::uuid,n,(child->>'points_override')::integer);
  n:=n+1;
 END LOOP;
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.create_question_bank_item(uuid,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_question_bank_item(uuid,text,jsonb,jsonb) TO authenticated;

-- Company colleagues can read assessment composition when allowed to read its bank.
CREATE POLICY hiring_link_company_read ON public.assessment_questions FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.assessments a WHERE a.id=assessment_id AND hiring_private.allowed(a.company_id,'question_bank','read')));
