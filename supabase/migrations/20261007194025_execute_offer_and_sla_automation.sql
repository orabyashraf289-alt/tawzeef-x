-- New events use existing owner-configured actions and stage SLA hours.
-- Existing drafts stay inactive; historic offers and stage entries are not replayed.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.automation_rules ADD COLUMN activated_at timestamptz;

CREATE OR REPLACE FUNCTION automation_private.config_error(_rule public.automation_rules)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE item jsonb; target uuid;
BEGIN
  IF _rule.trigger_event NOT IN ('candidate.stage_changed', 'application.created', 'offer.sent', 'sla.expired') THEN
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
  IF _rule.trigger_event = 'sla.expired' THEN
    IF (SELECT count(*) FROM jsonb_array_elements(_rule.conditions) c
        WHERE c->>'field'='stage' AND c->>'operator'='equals') <> 1 THEN
      RETURN 'sla_stage_required';
    END IF;
    IF (SELECT count(*) FROM public.pipeline_stages s
        WHERE s.company_id=_rule.company_id AND s.is_active
          AND s.name=(SELECT c->>'value' FROM jsonb_array_elements(_rule.conditions) c
            WHERE c->>'field'='stage' AND c->>'operator'='equals')) <> 1
      OR NOT EXISTS (SELECT 1 FROM public.pipeline_stages s
        WHERE s.company_id=_rule.company_id AND s.is_active AND s.sla_hours BETWEEN 1 AND 8760
          AND s.name=(SELECT c->>'value' FROM jsonb_array_elements(_rule.conditions) c
            WHERE c->>'field'='stage' AND c->>'operator'='equals')) THEN
      RETURN 'invalid_sla_stage';
    END IF;
  END IF;
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

CREATE OR REPLACE FUNCTION automation_private.guard_rule()
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
    IF TG_OP = 'INSERT' OR NOT OLD.is_active THEN
      NEW.activated_at := clock_timestamp();
    ELSE
      NEW.activated_at := COALESCE(OLD.activated_at, clock_timestamp());
    END IF;
  ELSE
    NEW.activated_at := NULL;
  END IF;
  RETURN NEW;
END $$;
UPDATE public.automation_rules SET activated_at=clock_timestamp() WHERE is_active;

CREATE FUNCTION automation_private.run_rules(_company uuid, _event text, _entity uuid,
  _candidate uuid, _event_id uuid, _link_error text, _only_rule uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rule public.automation_rules; candidate public.candidates; stage public.pipeline_stages;
  snapshot jsonb; action jsonb; problem text; log_id uuid; failure_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id=_company AND c.status='active'
    AND (c.parent_company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies parent
      WHERE parent.id=c.parent_company_id AND parent.status='active'))) THEN RETURN; END IF;
  SELECT * INTO candidate FROM public.candidates WHERE id=_candidate AND company_id=_company FOR UPDATE;
  IF NOT FOUND AND _link_error IS NULL THEN _link_error := 'candidate_not_found'; END IF;
  snapshot := jsonb_build_object('stage', candidate.stage, 'status', candidate.status,
    'source', candidate.source, 'job_id', candidate.job_id, 'ai_score', candidate.ai_score);
  FOR rule IN SELECT * FROM public.automation_rules
    WHERE company_id=_company AND trigger_event=_event AND is_active AND (_only_rule IS NULL OR id=_only_rule) ORDER BY created_at, id FOR SHARE
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
        'invalid_reviewer', 'unsupported_action', 'sla_stage_required', 'invalid_sla_stage', 'offer_candidate_mismatch', 'candidate_not_found', 'candidate_link_ambiguous',
        'stage_rules_unsupported', 'interview_required', 'evaluation_required', 'score_required', 'assessment_required'
      ) THEN SQLERRM ELSE 'execution_failed' END;
      UPDATE public.automation_logs SET status='failed', execution_details=execution_details || jsonb_build_object('code', failure_code)
        WHERE id=log_id;
    END;
  END LOOP;
END $$;

-- Preserve the existing five/six-argument entry point for ordinary events.
CREATE OR REPLACE FUNCTION automation_private.run_rules(_company uuid, _event text, _entity uuid,
  _candidate uuid, _event_id uuid, _link_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM automation_private.run_rules(_company, _event, _entity, _candidate, _event_id, _link_error, NULL);
END $$;

-- Recorded business event, not an email delivery receipt.
CREATE FUNCTION automation_private.on_offer_sent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE problem text;
BEGIN
  IF NEW.company_id IS NULL OR NEW.status <> 'sent' OR NEW.sent_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.sent_at IS NOT NULL OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN RETURN NEW; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidates c WHERE c.id=NEW.candidate_id AND c.company_id=NEW.company_id
      AND (NEW.job_id IS NULL OR c.job_id=NEW.job_id))
    OR (NEW.job_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.jobs j
      WHERE j.id=NEW.job_id AND j.company_id=NEW.company_id)) THEN
    problem := 'offer_candidate_mismatch';
  END IF;
  PERFORM automation_private.run_rules(NEW.company_id, 'offer.sent', NEW.id,
    NEW.candidate_id, NEW.id, problem);
  RETURN NEW;
END $$;
CREATE TRIGGER zz_automation_offer_sent AFTER INSERT OR UPDATE OF status, sent_at ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION automation_private.on_offer_sent();

-- No-op updates cannot restart or backdate the stage clock.
CREATE FUNCTION automation_private.track_stage_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.stage_entered_at := clock_timestamp();
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    NEW.stage_entered_at := clock_timestamp();
  ELSE
    NEW.stage_entered_at := OLD.stage_entered_at;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_automation_track_stage_entry BEFORE INSERT OR UPDATE OF stage, company_id, stage_entered_at
  ON public.candidates FOR EACH ROW EXECUTE FUNCTION automation_private.track_stage_entry();

CREATE TABLE automation_private.sla_events (
  rule_id uuid NOT NULL,
  company_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  activated_at timestamptz NOT NULL,
  stage_entered_at timestamptz NOT NULL,
  event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rule_id, activated_at, candidate_id, stage_entered_at),
  FOREIGN KEY (company_id, rule_id) REFERENCES public.automation_rules(company_id, id) ON DELETE CASCADE,
  FOREIGN KEY (company_id, candidate_id) REFERENCES public.candidates(company_id, id) ON DELETE CASCADE
);
CREATE INDEX automation_sla_company_candidate_idx ON automation_private.sla_events(company_id, candidate_id);
CREATE INDEX automation_sla_company_rule_idx ON automation_private.sla_events(company_id, rule_id);
ALTER TABLE automation_private.sla_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON automation_private.sla_events FROM PUBLIC, anon, authenticated;
CREATE INDEX candidates_company_stage_entry_idx ON public.candidates(company_id, stage, stage_entered_at);

-- Dispatch through a trigger to preserve the existing trigger-depth guard
-- against chaining automation-generated stage moves.
CREATE FUNCTION automation_private.on_sla_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM automation_private.run_rules(NEW.company_id,'sla.expired',NEW.candidate_id,
    NEW.candidate_id,NEW.event_id,NULL,NEW.rule_id);
  RETURN NEW;
END $$;
CREATE TRIGGER automation_dispatch_sla_event AFTER INSERT ON automation_private.sla_events
  FOR EACH ROW EXECUTE FUNCTION automation_private.on_sla_event();

CREATE FUNCTION automation_private.process_sla_expirations(_as_of timestamptz DEFAULT clock_timestamp(), _limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE due record; event uuid; processed integer := 0; current_rule public.automation_rules;
BEGIN
  IF _as_of IS NULL OR NOT pg_try_advisory_xact_lock(190742, 1) THEN RETURN 0; END IF;
  FOR due IN
    SELECT c.id AS candidate_id, c.company_id, c.stage, c.stage_entered_at, r.id AS rule_id, r.activated_at
    FROM public.candidates c
    JOIN public.companies company ON company.id=c.company_id AND company.status='active'
    JOIN public.pipeline_stages s ON s.company_id=c.company_id AND s.name=c.stage AND s.is_active
    JOIN public.automation_rules r ON r.company_id=c.company_id AND r.is_active AND r.trigger_event='sla.expired'
    WHERE (company.parent_company_id IS NULL OR EXISTS (SELECT 1 FROM public.companies parent
        WHERE parent.id=company.parent_company_id AND parent.status='active'))
      AND s.sla_hours BETWEEN 1 AND 8760
      AND c.stage_entered_at >= r.activated_at
      AND c.stage_entered_at + make_interval(hours => s.sla_hours) <= _as_of
      AND r.conditions @> jsonb_build_array(jsonb_build_object('field','stage','operator','equals','value',c.stage))
      AND (SELECT count(*) FROM public.pipeline_stages other
        WHERE other.company_id=c.company_id AND other.name=c.stage AND other.is_active)=1
      AND NOT EXISTS (SELECT 1 FROM automation_private.sla_events e
        WHERE e.rule_id=r.id AND e.activated_at=r.activated_at AND e.candidate_id=c.id AND e.stage_entered_at=c.stage_entered_at)
    ORDER BY c.stage_entered_at, c.id, r.created_at, r.id
    LIMIT LEAST(GREATEST(COALESCE(_limit,100),1),100)
    FOR UPDATE OF c SKIP LOCKED
  LOOP
    -- An earlier rule may have moved this candidate since the cursor was opened.
    IF NOT EXISTS (SELECT 1 FROM public.candidates c WHERE c.id=due.candidate_id
      AND c.company_id=due.company_id AND c.stage=due.stage AND c.stage_entered_at=due.stage_entered_at) THEN CONTINUE; END IF;
    PERFORM 1 FROM public.pipeline_stages s WHERE s.company_id=due.company_id
      AND s.name=due.stage AND s.is_active AND s.sla_hours BETWEEN 1 AND 8760
      AND due.stage_entered_at + make_interval(hours => s.sla_hours) <= _as_of FOR SHARE;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO current_rule FROM public.automation_rules
      WHERE id=due.rule_id AND company_id=due.company_id AND is_active
        AND activated_at=due.activated_at AND trigger_event='sla.expired' FOR SHARE;
    IF NOT FOUND THEN CONTINUE; END IF;
    event := NULL;
    INSERT INTO automation_private.sla_events(rule_id,company_id,candidate_id,activated_at,stage_entered_at)
      VALUES(due.rule_id,due.company_id,due.candidate_id,due.activated_at,due.stage_entered_at)
      ON CONFLICT DO NOTHING RETURNING event_id INTO event;
    IF event IS NULL THEN CONTINUE; END IF;
    processed := processed + 1;
  END LOOP;
  RETURN processed;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA automation_private FROM PUBLIC, anon, authenticated;

-- BEGIN CRON SCHEDULING (requires the Supabase pg_cron extension).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('automation-sla-expiry', '* * * * *', 'SELECT automation_private.process_sla_expirations();');
-- END CRON SCHEDULING.
