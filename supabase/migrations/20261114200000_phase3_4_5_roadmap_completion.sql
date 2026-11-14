-- Phase 3, 4 & 5 roadmap completion:
-- 1. SMS automation channel (send_sms) in automation queue & rules validator
-- 2. Two-way calendar sync connections (Google / Outlook / iCal feeds + conflict protection)
-- 3. Candidate company experience reviews
-- 4. Persistent Web Push subscriptions
-- 5. Enterprise field-level / department / approval permissions & PDPL/GDPR data retention execution RPC

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ============================================================================
-- 1. Automation SMS Outbound Channel (send_sms)
-- ============================================================================
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.automation_outbound_queue'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ~* '\yaction_type\y'
  LOOP
    EXECUTE format('ALTER TABLE public.automation_outbound_queue DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;

  ALTER TABLE public.automation_outbound_queue
    ADD CONSTRAINT automation_outbound_queue_action_type_check
    CHECK (action_type IN ('send_email', 'send_whatsapp', 'send_sms', 'trigger_webhook'));
END $$;

CREATE OR REPLACE FUNCTION automation_private.config_error(_rule public.automation_rules)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  item jsonb;
  payload jsonb;
  target uuid;
  email_subject text;
  email_body text;
  email_template_id text;
  recipient_type text;
  to_email text;
  webhook_url text;
  wa_content text;
  sms_content text;
  to_phone text;
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
    payload := item->'payload';
    IF item->>'type' = 'move_stage' THEN
      target := (payload->>'stage_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.pipeline_stages
        WHERE id=target AND company_id=_rule.company_id AND is_active) THEN RETURN 'invalid_stage'; END IF;
    ELSIF item->>'type' = 'assign_reviewer' THEN
      target := (payload->>'reviewer_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id=_rule.company_id
        AND user_id=target AND member_role IN ('owner', 'hr')) THEN RETURN 'invalid_reviewer'; END IF;
    ELSIF item->>'type' = 'send_email' THEN
      email_subject := NULLIF(btrim(payload->>'subject'), '');
      email_body := COALESCE(
        NULLIF(btrim(payload->>'body_html'), ''),
        NULLIF(btrim(payload->>'body'), ''),
        NULLIF(btrim(payload->>'html'), '')
      );
      email_template_id := NULLIF(btrim(payload->>'template_id'), '');
      IF (email_subject IS NULL OR email_body IS NULL) AND email_template_id IS NULL THEN
        RETURN 'unsupported_action';
      END IF;
      IF email_subject IS NOT NULL AND length(email_subject) > 500 THEN
        RETURN 'invalid_action';
      END IF;
      IF email_body IS NOT NULL AND length(email_body) > 20000 THEN
        RETURN 'invalid_action';
      END IF;
      recipient_type := COALESCE(NULLIF(btrim(payload->>'recipient_type'), ''), 'candidate');
      IF recipient_type NOT IN ('candidate', 'recruiter', 'custom') THEN
        RETURN 'invalid_email_recipient';
      END IF;
      IF recipient_type = 'custom' THEN
        to_email := COALESCE(NULLIF(btrim(payload->>'to_email'), ''), NULLIF(btrim(payload->>'to'), ''));
        IF to_email IS NULL OR to_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
          RETURN 'invalid_email_recipient';
        END IF;
      END IF;
    ELSIF item->>'type' = 'trigger_webhook' THEN
      webhook_url := NULLIF(btrim(payload->>'url'), '');
      IF webhook_url IS NULL THEN
        RETURN 'unsupported_action';
      END IF;
      IF NOT automation_private.is_valid_webhook_url(webhook_url) THEN
        RETURN 'invalid_webhook_url';
      END IF;
      IF (payload ? 'secret') AND jsonb_typeof(payload->'secret') <> 'string' THEN
        RETURN 'invalid_action';
      END IF;
      IF length(COALESCE(payload->>'secret', '')) > 500 THEN
        RETURN 'invalid_action';
      END IF;
    ELSIF item->>'type' = 'send_whatsapp' THEN
      wa_content := COALESCE(
        NULLIF(btrim(payload->>'message'), ''),
        NULLIF(btrim(payload->>'template_name'), '')
      );
      IF wa_content IS NULL THEN
        RETURN 'unsupported_action';
      END IF;
      IF length(wa_content) > 4000 THEN
        RETURN 'invalid_action';
      END IF;
      recipient_type := COALESCE(NULLIF(btrim(payload->>'recipient_type'), ''), 'candidate');
      IF recipient_type NOT IN ('candidate', 'custom') THEN
        RETURN 'invalid_whatsapp_recipient';
      END IF;
      IF recipient_type = 'custom' THEN
        to_phone := COALESCE(NULLIF(btrim(payload->>'to_phone'), ''), NULLIF(btrim(payload->>'phone'), ''));
        IF to_phone IS NULL OR regexp_replace(to_phone, '[^0-9]', '', 'g') !~ '^[0-9]{7,15}$' THEN
          RETURN 'invalid_whatsapp_recipient';
        END IF;
      END IF;
    ELSIF item->>'type' = 'send_sms' THEN
      sms_content := NULLIF(btrim(payload->>'message'), '');
      IF sms_content IS NULL THEN
        RETURN 'unsupported_action';
      END IF;
      IF length(sms_content) > 1600 THEN
        RETURN 'invalid_action';
      END IF;
      recipient_type := COALESCE(NULLIF(btrim(payload->>'recipient_type'), ''), 'candidate');
      IF recipient_type NOT IN ('candidate', 'custom') THEN
        RETURN 'invalid_sms_recipient';
      END IF;
      IF recipient_type = 'custom' THEN
        to_phone := COALESCE(NULLIF(btrim(payload->>'to_phone'), ''), NULLIF(btrim(payload->>'phone'), ''));
        IF to_phone IS NULL OR regexp_replace(to_phone, '[^0-9]', '', 'g') !~ '^[0-9]{7,15}$' THEN
          RETURN 'invalid_sms_recipient';
        END IF;
      END IF;
    ELSE
      RETURN 'unsupported_action';
    END IF;
  END LOOP;
  RETURN NULL;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN 'invalid_configuration';
END $$;

CREATE OR REPLACE FUNCTION automation_private.run_rules(_company uuid, _event text, _entity uuid,
  _candidate uuid, _event_id uuid, _link_error text, _only_rule uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rule public.automation_rules;
  candidate public.candidates;
  stage public.pipeline_stages;
  snapshot jsonb;
  action_row record;
  action jsonb;
  action_type text;
  sanitized_payload jsonb;
  problem text;
  log_id uuid;
  failure_code text;
  outbound_count integer;
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
      outbound_count := 0;
      problem := COALESCE(_link_error, automation_private.config_error(rule));
      IF problem IS NOT NULL THEN RAISE EXCEPTION '%', problem USING ERRCODE = '22023'; END IF;
      IF NOT automation_private.conditions_match(rule.conditions, snapshot) THEN
        UPDATE public.automation_logs SET status='skipped', execution_details=execution_details || '{"code":"conditions_not_met"}'
          WHERE id=log_id;
        CONTINUE;
      END IF;
      FOR action_row IN
        SELECT (ord - 1)::integer AS action_idx, val AS action
        FROM jsonb_array_elements(rule.actions) WITH ORDINALITY AS t(val, ord)
      LOOP
        action := action_row.action;
        action_type := action->>'type';
        IF action_type = 'assign_reviewer' THEN
          PERFORM 1 FROM public.company_members WHERE company_id=_company
            AND user_id=(action->'payload'->>'reviewer_id')::uuid AND member_role IN ('owner', 'hr') FOR SHARE;
          IF NOT FOUND THEN RAISE EXCEPTION 'invalid_reviewer' USING ERRCODE = '22023'; END IF;
          INSERT INTO public.candidate_reviewer_assignments(company_id, candidate_id, reviewer_id, rule_id)
            VALUES (_company, _candidate, (action->'payload'->>'reviewer_id')::uuid, rule.id)
            ON CONFLICT (candidate_id) DO UPDATE SET reviewer_id=EXCLUDED.reviewer_id, rule_id=EXCLUDED.rule_id, assigned_at=now();
        ELSIF action_type = 'move_stage' THEN
          SELECT * INTO stage FROM public.pipeline_stages WHERE company_id=_company
            AND id=(action->'payload'->>'stage_id')::uuid AND is_active FOR SHARE;
          IF NOT FOUND THEN RAISE EXCEPTION 'invalid_stage' USING ERRCODE = '22023'; END IF;
          SELECT * INTO candidate FROM public.candidates WHERE id=_candidate AND company_id=_company;
          IF candidate.stage IS NOT DISTINCT FROM stage.name THEN CONTINUE; END IF;
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
        ELSIF action_type IN ('send_email', 'send_whatsapp', 'send_sms', 'trigger_webhook') THEN
          sanitized_payload := COALESCE(action->'payload', '{}'::jsonb) - 'secret' - 'hmac_secret';
          INSERT INTO public.automation_outbound_queue (
            company_id, rule_id, log_id, candidate_id, action_type, action_index, payload, status
          ) VALUES (
            _company,
            rule.id,
            log_id,
            _candidate,
            action_type,
            action_row.action_idx,
            jsonb_build_object(
              'action_payload', sanitized_payload,
              'trigger_event', _event,
              'entity_id', _entity,
              'event_id', _event_id,
              'rule_title', rule.title,
              'snapshot', snapshot
            ),
            'pending'
          )
          ON CONFLICT (log_id, action_index) WHERE log_id IS NOT NULL DO NOTHING;
          outbound_count := outbound_count + 1;
        END IF;
      END LOOP;

      IF outbound_count = 0 THEN
        UPDATE public.automation_logs
          SET status='success', execution_details=execution_details || '{"code":"completed"}'
          WHERE id=log_id;
      ELSE
        UPDATE public.automation_logs
          SET status='running',
              execution_details=execution_details || jsonb_build_object('code', 'queued_outbound', 'queued_count', outbound_count)
          WHERE id=log_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      failure_code := CASE WHEN SQLSTATE='22023' AND SQLERRM IN (
        'unsupported_event', 'invalid_configuration', 'invalid_condition', 'invalid_action', 'invalid_stage',
        'invalid_reviewer', 'unsupported_action', 'sla_stage_required', 'invalid_sla_stage', 'offer_candidate_mismatch',
        'candidate_not_found', 'candidate_link_ambiguous', 'stage_rules_unsupported', 'interview_required',
        'evaluation_required', 'score_required', 'assessment_required', 'invalid_webhook_url',
        'invalid_email_recipient', 'invalid_whatsapp_recipient', 'invalid_sms_recipient'
      ) THEN SQLERRM ELSE 'execution_failed' END;
      UPDATE public.automation_logs SET status='failed', execution_details=execution_details || jsonb_build_object('code', failure_code)
        WHERE id=log_id;
    END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_automation_outbound_action(
  _company_id uuid,
  _rule_id uuid DEFAULT NULL,
  _log_id uuid DEFAULT NULL,
  _candidate_id uuid DEFAULT NULL,
  _action_type text DEFAULT NULL,
  _payload jsonb DEFAULT '{}'::jsonb,
  _action_index integer DEFAULT 0
)
RETURNS public.automation_outbound_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  is_service boolean := (auth.role() = 'service_role');
  row_out public.automation_outbound_queue;
BEGIN
  IF NOT is_service THEN
    IF actor IS NULL THEN
      RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;
    IF NOT (
      public.is_company_owner(_company_id)
      OR EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = _company_id
          AND cm.user_id = actor
          AND cm.member_role IN ('owner', 'admin')
      )
    ) THEN
      RAISE EXCEPTION 'company_owner_or_admin_required' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF _company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id
      AND c.status = 'active'
      AND (
        c.parent_company_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.companies parent
          WHERE parent.id = c.parent_company_id AND parent.status = 'active'
        )
      )
  ) THEN
    RAISE EXCEPTION 'company_inactive' USING ERRCODE = '22023';
  END IF;

  IF _action_type NOT IN ('send_email', 'send_whatsapp', 'send_sms', 'trigger_webhook') THEN
    RAISE EXCEPTION 'unsupported_action' USING ERRCODE = '22023';
  END IF;

  IF _payload IS NULL OR jsonb_typeof(_payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;

  IF _rule_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.automation_rules r WHERE r.id = _rule_id AND r.company_id = _company_id
  ) THEN
    RAISE EXCEPTION 'rule_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _log_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.automation_logs l WHERE l.id = _log_id AND l.company_id = _company_id
  ) THEN
    RAISE EXCEPTION 'invalid_configuration' USING ERRCODE = '22023';
  END IF;

  IF _candidate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.candidates c WHERE c.id = _candidate_id AND c.company_id = _company_id
  ) THEN
    RAISE EXCEPTION 'candidate_not_found' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.automation_outbound_queue (
    company_id, rule_id, log_id, candidate_id, action_type, action_index, payload, status
  ) VALUES (
    _company_id,
    _rule_id,
    _log_id,
    _candidate_id,
    _action_type,
    GREATEST(COALESCE(_action_index, 0), 0),
    CASE
      WHEN (_payload ? 'action_payload') AND jsonb_typeof(_payload->'action_payload') = 'object' THEN
        jsonb_set(
          _payload - 'secret' - 'hmac_secret',
          '{action_payload}',
          (_payload->'action_payload') - 'secret' - 'hmac_secret',
          false
        )
      ELSE
        _payload - 'secret' - 'hmac_secret'
    END,
    'pending'
  )
  ON CONFLICT (log_id, action_index) WHERE log_id IS NOT NULL
  DO UPDATE SET updated_at = clock_timestamp()
  RETURNING * INTO row_out;

  RETURN row_out;
END $$;

REVOKE ALL ON FUNCTION public.enqueue_automation_outbound_action(uuid, uuid, uuid, uuid, text, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_automation_outbound_action(uuid, uuid, uuid, uuid, text, jsonb, integer) TO authenticated, service_role;

-- ============================================================================
-- 2. Calendar Sync Connections (Google / Outlook / iCal + Conflict Protection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_sync_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'outlook', 'ics')),
  calendar_email text,
  external_feed_url text,
  sync_direction text NOT NULL DEFAULT 'two_way' CHECK (sync_direction IN ('read_only', 'two_way')),
  conflict_protection boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_sync_connections_company_user_provider_key UNIQUE (company_id, user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_connections_company_user
  ON public.calendar_sync_connections(company_id, user_id);

ALTER TABLE public.calendar_sync_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.calendar_sync_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_sync_connections TO authenticated;
GRANT ALL ON TABLE public.calendar_sync_connections TO service_role;

DROP POLICY IF EXISTS "Company members read calendar connections" ON public.calendar_sync_connections;
CREATE POLICY "Company members read calendar connections"
  ON public.calendar_sync_connections
  FOR SELECT
  TO authenticated
  USING (
    public.can_manage_company_retention(company_id)
    OR (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = calendar_sync_connections.company_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users manage own calendar connections" ON public.calendar_sync_connections;
CREATE POLICY "Users manage own calendar connections"
  ON public.calendar_sync_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR public.is_company_owner(company_id)
      OR EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = calendar_sync_connections.company_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users update own calendar connections" ON public.calendar_sync_connections;
CREATE POLICY "Users update own calendar connections"
  ON public.calendar_sync_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.can_manage_company_retention(company_id))
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.can_manage_company_retention(company_id));

DROP POLICY IF EXISTS "Users delete own calendar connections" ON public.calendar_sync_connections;
CREATE POLICY "Users delete own calendar connections"
  ON public.calendar_sync_connections
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.can_manage_company_retention(company_id));

DROP TRIGGER IF EXISTS update_calendar_sync_connections_ts ON public.calendar_sync_connections;
CREATE TRIGGER update_calendar_sync_connections_ts
  BEFORE UPDATE ON public.calendar_sync_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 3. Candidate Company Reviews (Submitted via candidate-portal Edge Function)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.candidate_company_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  overall_rating integer NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  communication_rating integer CHECK (communication_rating BETWEEN 1 AND 5),
  fairness_rating integer CHECK (fairness_rating BETWEEN 1 AND 5),
  comment text,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_company_reviews_candidate_id_key UNIQUE (candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_company_reviews_company
  ON public.candidate_company_reviews(company_id, created_at DESC);

ALTER TABLE public.candidate_company_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.candidate_company_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.candidate_company_reviews TO authenticated;
GRANT ALL ON TABLE public.candidate_company_reviews TO service_role;

DROP POLICY IF EXISTS "Company members read candidate company reviews" ON public.candidate_company_reviews;
CREATE POLICY "Company members read candidate company reviews"
  ON public.candidate_company_reviews
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin((SELECT auth.uid()))
    OR public.is_company_owner(company_id)
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = candidate_company_reviews.company_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

DROP TRIGGER IF EXISTS update_candidate_company_reviews_ts ON public.candidate_company_reviews;
CREATE TRIGGER update_candidate_company_reviews_ts
  BEFORE UPDATE ON public.candidate_company_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 4. Persistent Browser / PWA Push Notification Subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text,
  auth_secret text,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_user_push_subscriptions_user
  ON public.user_push_subscriptions(user_id, is_active);

ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.user_push_subscriptions TO service_role;

DROP POLICY IF EXISTS "Users read own push subscriptions" ON public.user_push_subscriptions;
CREATE POLICY "Users read own push subscriptions"
  ON public.user_push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users insert own push subscriptions" ON public.user_push_subscriptions;
CREATE POLICY "Users insert own push subscriptions"
  ON public.user_push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      company_id IS NULL
      OR public.is_super_admin((SELECT auth.uid()))
      OR public.is_company_owner(company_id)
      OR EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = user_push_subscriptions.company_id
          AND cm.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users update own push subscriptions" ON public.user_push_subscriptions;
CREATE POLICY "Users update own push subscriptions"
  ON public.user_push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users delete own push subscriptions" ON public.user_push_subscriptions;
CREATE POLICY "Users delete own push subscriptions"
  ON public.user_push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP TRIGGER IF EXISTS update_user_push_subscriptions_ts ON public.user_push_subscriptions;
CREATE TRIGGER update_user_push_subscriptions_ts
  BEFORE UPDATE ON public.user_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 5. Enterprise Field/Department/Approval Governance & Data Retention Execution
-- ============================================================================
ALTER TABLE public.granular_permissions
  ADD COLUMN IF NOT EXISTS field_restrictions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS department_scope text[],
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.execute_company_data_retention(
  _company_id uuid,
  _dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_is_service boolean := (auth.role() = 'service_role');
  v_candidate_days integer := 365;
  v_rejected_days integer := 180;
  v_audit_days integer := 730;
  v_auto_enabled boolean := false;
  v_eligible_count integer := 0;
  v_anonymized_count integer := 0;
BEGIN
  IF _company_id IS NULL THEN
    RAISE EXCEPTION 'company_id_required' USING ERRCODE = '22023';
  END IF;

  IF NOT v_is_service AND NOT public.can_manage_company_retention(_company_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT
    p.candidate_retention_days,
    p.rejected_application_days,
    p.audit_log_retention_days,
    p.auto_anonymize_enabled
  INTO v_candidate_days, v_rejected_days, v_audit_days, v_auto_enabled
  FROM public.company_retention_policies p
  WHERE p.company_id = _company_id;

  IF NOT FOUND THEN
    v_candidate_days := 365;
    v_rejected_days := 180;
    v_audit_days := 730;
    v_auto_enabled := false;
  END IF;

  SELECT count(*)::integer
  INTO v_eligible_count
  FROM public.candidates c
  WHERE c.company_id = _company_id
    AND COALESCE(c.email, '') NOT LIKE 'anonymized-%'
    AND (
      (
        c.status IN ('rejected', 'مرفوض', 'مستبعد')
        AND c.updated_at < (now() - pg_catalog.make_interval(days => v_rejected_days))
      )
      OR (
        c.status NOT IN ('hired', 'مقبول', 'معين')
        AND c.updated_at < (now() - pg_catalog.make_interval(days => v_candidate_days))
      )
    );

  IF NOT COALESCE(_dry_run, true) THEN
    UPDATE public.candidates c
    SET
      name = 'مرشح مجهول الهوية (PDPL)',
      email = 'anonymized-' || c.id::text || '@redacted.local',
      phone = NULL,
      location = NULL,
      notes = NULL,
      resume_url = NULL,
      demo_video_url = NULL,
      expected_salary = NULL,
      license_number = NULL,
      summary = NULL,
      updated_at = now()
    WHERE c.company_id = _company_id
      AND COALESCE(c.email, '') NOT LIKE 'anonymized-%'
      AND (
        (
          c.status IN ('rejected', 'مرفوض', 'مستبعد')
          AND c.updated_at < (now() - pg_catalog.make_interval(days => v_rejected_days))
        )
        OR (
          c.status NOT IN ('hired', 'مقبول', 'معين')
          AND c.updated_at < (now() - pg_catalog.make_interval(days => v_candidate_days))
        )
      );

    GET DIAGNOSTICS v_anonymized_count = ROW_COUNT;

    INSERT INTO public.audit_log (company_id, user_id, event_type, details)
    VALUES (
      _company_id,
      v_actor,
      'company_data_retention_executed',
      jsonb_build_object(
        'anonymized_candidates', v_anonymized_count,
        'candidate_retention_days', v_candidate_days,
        'rejected_application_days', v_rejected_days,
        'audit_log_retention_days', v_audit_days
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'company_id', _company_id,
    'dry_run', COALESCE(_dry_run, true),
    'candidate_retention_days', v_candidate_days,
    'rejected_application_days', v_rejected_days,
    'audit_log_retention_days', v_audit_days,
    'auto_anonymize_enabled', v_auto_enabled,
    'eligible_candidates', v_eligible_count,
    'anonymized_candidates', v_anonymized_count,
    'executed_at', now()
  );
END $$;

REVOKE ALL ON FUNCTION public.execute_company_data_retention(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_company_data_retention(uuid, boolean) TO authenticated, service_role;
