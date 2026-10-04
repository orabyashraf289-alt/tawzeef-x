-- Internal actions only. Existing rules remain inactive; no rows are backfilled.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.automation_rules WHERE is_active) THEN
    RAISE EXCEPTION 'Review existing active rules before installing the runtime';
  END IF;
END $$;

CREATE SCHEMA automation_private;
REVOKE ALL ON SCHEMA automation_private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.candidates ADD CONSTRAINT candidates_company_id_key UNIQUE (company_id, id);
CREATE TABLE public.candidate_reviewer_assignments (
  candidate_id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  rule_id uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, candidate_id) REFERENCES public.candidates(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, reviewer_id) REFERENCES public.company_members(company_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, rule_id) REFERENCES public.automation_rules(company_id, id) ON DELETE SET NULL (rule_id)
);
CREATE INDEX candidate_reviewer_company_user_idx ON public.candidate_reviewer_assignments(company_id, reviewer_id);
CREATE INDEX candidate_reviewer_rule_idx ON public.candidate_reviewer_assignments(company_id, rule_id);
ALTER TABLE public.candidate_reviewer_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.candidate_reviewer_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.candidate_reviewer_assignments TO authenticated;
GRANT ALL ON public.candidate_reviewer_assignments TO service_role;
CREATE POLICY "Company members view reviewer assignments" ON public.candidate_reviewer_assignments
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));

ALTER TABLE public.automation_logs ADD COLUMN event_id uuid;
CREATE UNIQUE INDEX automation_logs_event_rule_idx ON public.automation_logs(event_id, rule_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX automation_rules_active_event_idx ON public.automation_rules(company_id, trigger_event)
  WHERE is_active;

-- Returns a stable code, never SQL or a user-provided description to execute.
CREATE FUNCTION automation_private.config_error(_rule public.automation_rules)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE item jsonb; target uuid;
BEGIN
  IF _rule.trigger_event NOT IN ('candidate.stage_changed', 'application.created') THEN
    RETURN 'unsupported_event';
  END IF;
  IF jsonb_array_length(_rule.actions) NOT BETWEEN 1 AND 10
     OR jsonb_array_length(_rule.conditions) > 10 THEN RETURN 'invalid_configuration'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(_rule.conditions) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR item->>'field' IS NULL OR item->>'operator' IS NULL
       OR NOT (item ? 'value') THEN RETURN 'invalid_condition'; END IF;
    IF item->>'field' = 'ai_score' THEN
      IF item->>'operator' NOT IN ('equals', 'greater_than', 'less_than')
         OR jsonb_typeof(item->'value') IS DISTINCT FROM 'number'
         OR (item->>'value')::numeric NOT BETWEEN 0 AND 100 THEN RETURN 'invalid_condition'; END IF;
    ELSIF item->>'field' IN ('stage', 'status', 'source', 'job_id') THEN
      IF item->>'operator' NOT IN ('equals', 'contains')
         OR jsonb_typeof(item->'value') IS DISTINCT FROM 'string'
         OR length(item->>'value') NOT BETWEEN 1 AND 255 THEN RETURN 'invalid_condition'; END IF;
      IF item->>'field' = 'job_id' THEN
        IF item->>'operator' <> 'equals' THEN RETURN 'invalid_condition'; END IF;
        target := (item->>'value')::uuid;
        IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id=target AND company_id=_rule.company_id) THEN
          RETURN 'invalid_condition';
        END IF;
      END IF;
    ELSE RETURN 'invalid_condition'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(_rule.actions) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR jsonb_typeof(item->'payload') IS DISTINCT FROM 'object' THEN RETURN 'invalid_action'; END IF;
    IF item->>'type' = 'move_stage' THEN
      target := (item->'payload'->>'stage_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.pipeline_stages
        WHERE id=target AND company_id=_rule.company_id AND is_active) THEN RETURN 'invalid_stage'; END IF;
    ELSIF item->>'type' = 'assign_reviewer' THEN
      target := (item->'payload'->>'reviewer_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id=_rule.company_id
        AND user_id=target AND member_role IN ('owner', 'hr')) THEN RETURN 'invalid_reviewer'; END IF;
    ELSE RETURN 'unsupported_action'; END IF;
  END LOOP;
  RETURN NULL;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN 'invalid_configuration';
END $$;

CREATE FUNCTION automation_private.guard_rule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE problem text;
BEGIN
  -- Editing execution settings pauses the rule until its owner reviews it again.
  IF TG_OP = 'UPDATE' AND (NEW.trigger_event, NEW.conditions, NEW.actions)
       IS DISTINCT FROM (OLD.trigger_event, OLD.conditions, OLD.actions) THEN
    NEW.is_active := false;
  END IF;
  NEW.updated_at := now();
  IF NEW.is_active THEN
    problem := automation_private.config_error(NEW);
    IF problem IS NOT NULL THEN RAISE EXCEPTION '%', problem USING ERRCODE = '22023'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER automation_rule_validation BEFORE INSERT OR UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION automation_private.guard_rule();

CREATE FUNCTION public.set_automation_rule_active(_company_id uuid, _rule_id uuid, _is_active boolean)
RETURNS public.automation_rules LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE rule public.automation_rules;
BEGIN
  IF auth.uid() IS NULL OR public.is_company_owner(_company_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'company_owner_required' USING ERRCODE = '42501';
  END IF;
  IF _is_active IS NULL THEN RAISE EXCEPTION 'invalid_configuration' USING ERRCODE = '22023'; END IF;
  -- Serialize activations per tenant and bound synchronous work per event.
  PERFORM 1 FROM public.companies WHERE id=_company_id FOR UPDATE;
  SELECT * INTO rule FROM public.automation_rules WHERE id=_rule_id AND company_id=_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rule_not_found' USING ERRCODE = 'P0002'; END IF;
  IF _is_active THEN
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id=_company_id AND status='active') THEN
      RAISE EXCEPTION 'company_inactive' USING ERRCODE = '22023';
    END IF;
    IF NOT rule.is_active AND (SELECT count(*) FROM public.automation_rules
      WHERE company_id=_company_id AND is_active) >= 25 THEN
      RAISE EXCEPTION 'active_rule_limit' USING ERRCODE = '22023';
    END IF;
  END IF;
  UPDATE public.automation_rules SET is_active=_is_active
    WHERE id=_rule_id AND company_id=_company_id RETURNING * INTO rule;
  RETURN rule;
END $$;
REVOKE ALL ON FUNCTION public.set_automation_rule_active(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_automation_rule_active(uuid, uuid, boolean) TO authenticated;

CREATE FUNCTION automation_private.conditions_match(_conditions jsonb, _snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE item jsonb; actual jsonb; matches boolean;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(_conditions) LOOP
    actual := _snapshot->(item->>'field');
    matches := CASE item->>'operator'
      WHEN 'equals' THEN actual = item->'value'
      WHEN 'contains' THEN position((item->>'value') IN (_snapshot->>(item->>'field'))) > 0
      WHEN 'greater_than' THEN (actual#>>'{}')::numeric > (item->>'value')::numeric
      WHEN 'less_than' THEN (actual#>>'{}')::numeric < (item->>'value')::numeric
      ELSE false END;
    IF matches IS DISTINCT FROM true THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;

CREATE FUNCTION automation_private.run_rules(_company uuid, _event text, _entity uuid,
  _candidate uuid, _event_id uuid, _link_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rule public.automation_rules; candidate public.candidates; stage public.pipeline_stages;
  snapshot jsonb; action jsonb; problem text; log_id uuid; failure_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id=_company AND status='active') THEN RETURN; END IF;
  SELECT * INTO candidate FROM public.candidates WHERE id=_candidate AND company_id=_company FOR UPDATE;
  IF NOT FOUND AND _link_error IS NULL THEN _link_error := 'candidate_not_found'; END IF;
  snapshot := jsonb_build_object('stage', candidate.stage, 'status', candidate.status,
    'source', candidate.source, 'job_id', candidate.job_id, 'ai_score', candidate.ai_score);
  FOR rule IN SELECT * FROM public.automation_rules
    WHERE company_id=_company AND trigger_event=_event AND is_active ORDER BY created_at, id FOR SHARE
  LOOP
    log_id := NULL;
    INSERT INTO public.automation_logs(company_id, rule_id, trigger_event, entity_id, event_id, status, execution_details)
      VALUES (_company, rule.id, _event, _entity, _event_id, 'running', jsonb_build_object('candidate_id', _candidate))
      ON CONFLICT (event_id, rule_id) WHERE event_id IS NOT NULL DO NOTHING RETURNING id INTO log_id;
    IF log_id IS NULL THEN CONTINUE; END IF;
    BEGIN
      problem := COALESCE(_link_error, automation_private.config_error(rule));
      IF problem IS NOT NULL THEN RAISE EXCEPTION '%', problem USING ERRCODE = '22023'; END IF;
      IF NOT automation_private.conditions_match(rule.conditions, snapshot) THEN
        UPDATE public.automation_logs SET status='skipped', execution_details=execution_details || '{"code":"conditions_not_met"}'
          WHERE id=log_id;
        CONTINUE;
      END IF;
      FOR action IN SELECT value FROM jsonb_array_elements(rule.actions) LOOP
        IF action->>'type' = 'assign_reviewer' THEN
          PERFORM 1 FROM public.company_members WHERE company_id=_company
            AND user_id=(action->'payload'->>'reviewer_id')::uuid AND member_role IN ('owner', 'hr') FOR SHARE;
          IF NOT FOUND THEN RAISE EXCEPTION 'invalid_reviewer' USING ERRCODE = '22023'; END IF;
          INSERT INTO public.candidate_reviewer_assignments(company_id, candidate_id, reviewer_id, rule_id)
            VALUES (_company, _candidate, (action->'payload'->>'reviewer_id')::uuid, rule.id)
            ON CONFLICT (candidate_id) DO UPDATE SET reviewer_id=EXCLUDED.reviewer_id, rule_id=EXCLUDED.rule_id, assigned_at=now();
        ELSIF action->>'type' = 'move_stage' THEN
          SELECT * INTO stage FROM public.pipeline_stages WHERE company_id=_company
            AND id=(action->'payload'->>'stage_id')::uuid AND is_active FOR SHARE;
          IF NOT FOUND THEN RAISE EXCEPTION 'invalid_stage' USING ERRCODE = '22023'; END IF;
          SELECT * INTO candidate FROM public.candidates WHERE id=_candidate AND company_id=_company;
          IF candidate.stage IS NOT DISTINCT FROM stage.name THEN CONTINUE; END IF;
          -- Preserve stage gates; automation must not bypass a manual prerequisite.
          IF jsonb_typeof(stage.transition_rules) IS DISTINCT FROM 'object'
            OR EXISTS (SELECT 1 FROM jsonb_object_keys(stage.transition_rules) k
              WHERE k NOT IN ('require_interview', 'require_ai_evaluation', 'min_ai_score', 'require_assessment')) THEN
            RAISE EXCEPTION 'stage_rules_unsupported' USING ERRCODE = '22023';
          END IF;
          IF COALESCE((stage.transition_rules->>'require_interview')::boolean, false)
            AND NOT EXISTS (SELECT 1 FROM public.interviews WHERE company_id=_company
              AND candidate_id=_candidate AND status='مكتملة') THEN
            RAISE EXCEPTION 'interview_required' USING ERRCODE = '22023';
          END IF;
          IF COALESCE((stage.transition_rules->>'require_ai_evaluation')::boolean, false) AND candidate.ai_score IS NULL THEN
            RAISE EXCEPTION 'evaluation_required' USING ERRCODE = '22023';
          END IF;
          IF stage.transition_rules ? 'min_ai_score' AND
            (candidate.ai_score IS NULL OR candidate.ai_score < (stage.transition_rules->>'min_ai_score')::numeric) THEN
            RAISE EXCEPTION 'score_required' USING ERRCODE = '22023';
          END IF;
          IF COALESCE((stage.transition_rules->>'require_assessment')::boolean, false)
            AND (stage.assessment_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.assessment_responses
              WHERE candidate_id=_candidate AND assessment_id=stage.assessment_id AND status='completed')) THEN
            RAISE EXCEPTION 'assessment_required' USING ERRCODE = '22023';
          END IF;
          UPDATE public.candidates SET stage=stage.name, stage_entered_at=now(), updated_at=now()
            WHERE id=_candidate AND company_id=_company;
        END IF;
      END LOOP;
      UPDATE public.automation_logs SET status='success', execution_details=execution_details || '{"code":"completed"}' WHERE id=log_id;
    EXCEPTION WHEN OTHERS THEN
      -- The rule's actions roll back together. Preserve the originating business event.
      failure_code := CASE WHEN SQLSTATE='22023' AND SQLERRM IN (
        'unsupported_event', 'invalid_configuration', 'invalid_condition', 'invalid_action', 'invalid_stage',
        'invalid_reviewer', 'unsupported_action', 'candidate_not_found', 'candidate_link_ambiguous',
        'stage_rules_unsupported', 'interview_required', 'evaluation_required', 'score_required', 'assessment_required'
      ) THEN SQLERRM ELSE 'execution_failed' END;
      UPDATE public.automation_logs SET status='failed', execution_details=execution_details || jsonb_build_object('code', failure_code)
        WHERE id=log_id;
    END;
  END LOOP;
END $$;

CREATE FUNCTION automation_private.on_candidate_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- An action never emits another automation event, including cycles between rules.
  IF pg_trigger_depth() > 1 OR NEW.company_id IS NULL
    OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN RETURN NEW; END IF;
  PERFORM automation_private.run_rules(NEW.company_id, 'candidate.stage_changed', NEW.id, NEW.id, gen_random_uuid());
  RETURN NEW;
END $$;
CREATE TRIGGER zz_automation_candidate_stage AFTER UPDATE OF stage ON public.candidates
  FOR EACH ROW WHEN (OLD.stage IS DISTINCT FROM NEW.stage) EXECUTE FUNCTION automation_private.on_candidate_stage();

CREATE FUNCTION automation_private.on_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE company uuid; candidate uuid; matches bigint;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  -- Runs after on_new_application, which may have filled the stored company ID.
  SELECT a.company_id INTO company FROM public.applications a JOIN public.jobs j ON j.id=a.job_id
    WHERE a.id=NEW.id AND a.company_id=j.company_id;
  IF company IS NULL THEN RETURN NEW; END IF;
  SELECT count(*), (array_agg(c.id))[1] INTO matches, candidate FROM public.candidates c
    WHERE c.company_id=company AND c.job_id=NEW.job_id AND lower(c.email)=lower(NEW.email);
  IF matches <> 1 THEN candidate := NULL; END IF;
  PERFORM automation_private.run_rules(company, 'application.created', NEW.id, candidate, gen_random_uuid(),
    CASE WHEN matches=0 THEN 'candidate_not_found' WHEN matches>1 THEN 'candidate_link_ambiguous' END);
  RETURN NEW;
END $$;
CREATE TRIGGER zz_automation_application_created AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION automation_private.on_application();

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA automation_private FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA automation_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
