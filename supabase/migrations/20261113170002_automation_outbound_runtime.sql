-- Phase 2 outbound automation runtime: queue, strict tenant RLS, safe enqueue/claim RPCs,
-- outbound action validation, and webhook_deliveries company-scoped logging.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Ensure composite unique key exists on automation_logs for tenant-scoped FKs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'automation_logs_company_id_key'
      AND conrelid = 'public.automation_logs'::regclass
  ) THEN
    ALTER TABLE public.automation_logs
      ADD CONSTRAINT automation_logs_company_id_key UNIQUE (company_id, id);
  END IF;
END $$;

-- Outbound action execution queue (company-scoped, server-claimed).
CREATE TABLE IF NOT EXISTS public.automation_outbound_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id uuid,
  log_id uuid,
  candidate_id uuid,
  action_type text NOT NULL CHECK (action_type IN ('send_email', 'send_whatsapp', 'trigger_webhook')),
  action_index integer NOT NULL DEFAULT 0 CHECK (action_index >= 0),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'failed', 'skipped_unconfigured')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text,
  processed_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_outbound_queue_rule_scope_fkey
    FOREIGN KEY (company_id, rule_id) REFERENCES public.automation_rules(company_id, id) ON DELETE SET NULL (rule_id),
  CONSTRAINT automation_outbound_queue_log_scope_fkey
    FOREIGN KEY (company_id, log_id) REFERENCES public.automation_logs(company_id, id) ON DELETE SET NULL (log_id),
  CONSTRAINT automation_outbound_queue_candidate_scope_fkey
    FOREIGN KEY (company_id, candidate_id) REFERENCES public.candidates(company_id, id) ON DELETE SET NULL (candidate_id)
);

CREATE INDEX IF NOT EXISTS automation_outbound_queue_pending_idx
  ON public.automation_outbound_queue(company_id, status, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS automation_outbound_queue_company_created_idx
  ON public.automation_outbound_queue(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS automation_outbound_queue_log_idx
  ON public.automation_outbound_queue(log_id)
  WHERE log_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS automation_outbound_queue_log_action_uidx
  ON public.automation_outbound_queue(log_id, action_index)
  WHERE log_id IS NOT NULL;

ALTER TABLE public.automation_outbound_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_outbound_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.automation_outbound_queue TO authenticated;
GRANT ALL ON public.automation_outbound_queue TO service_role;

DROP POLICY IF EXISTS "Company members view automation outbound queue" ON public.automation_outbound_queue;
CREATE POLICY "Company members view automation outbound queue"
  ON public.automation_outbound_queue
  FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

-- Extend webhook_deliveries so rule-triggered webhooks log cleanly alongside endpoint-based webhooks.
ALTER TABLE public.webhook_deliveries
  ALTER COLUMN endpoint_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rule_id uuid,
  ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.automation_outbound_queue(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS webhook_deliveries_company_created_idx
  ON public.webhook_deliveries(company_id, created_at DESC)
  WHERE company_id IS NOT NULL;

DROP POLICY IF EXISTS "Company members view company webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Company members view company webhook deliveries"
  ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id));

-- Helper to pre-validate HTTPS webhook URLs inside SQL (runtime performs full DNS/IP SSRF checks).
CREATE OR REPLACE FUNCTION automation_private.is_valid_webhook_url(_raw_url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  cleaned text;
  authority text;
  host_part text;
BEGIN
  cleaned := NULLIF(btrim(_raw_url), '');
  IF cleaned IS NULL OR length(cleaned) > 2000 THEN
    RETURN false;
  END IF;
  IF cleaned !~* '^https://[^\s/@?#]+(:[0-9]{1,5})?(/[^\s]*)?$' THEN
    RETURN false;
  END IF;

  authority := split_part(split_part(split_part(regexp_replace(cleaned, '^https://', '', 'i'), '/', 1), '?', 1), '#', 1);
  IF authority = '' OR position('@' IN authority) > 0 THEN
    RETURN false;
  END IF;

  IF left(authority, 1) = '[' THEN
    host_part := lower(substring(authority FROM '^\[([^\]]+)\]'));
  ELSE
    host_part := lower(split_part(authority, ':', 1));
  END IF;

  IF host_part IS NULL OR host_part = '' THEN
    RETURN false;
  END IF;

  -- Block localhost, internal/local domains, loopback, private, link-local/metadata IPs, and obfuscated numeric/hex IPs.
  IF host_part IN ('localhost', 'metadata', 'metadata.google.internal', 'instance-data', '0.0.0.0', '::', '::1')
     OR host_part ~ '\.(localhost|local|internal|localdomain)$'
     OR host_part ~ '^(127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.)'
     OR host_part ~ '^(fc|fd|fe80|::ffff:)'
     OR host_part ~ '^[0-9]+$'
     OR host_part ~ '^0x[0-9a-f]+$' THEN
    RETURN false;
  END IF;

  RETURN true;
END $$;

-- Update rule configuration validator to recognize real outbound action configurations
-- while rejecting unconfigured/legacy communication drafts with 'unsupported_action'.
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
    ELSE
      RETURN 'unsupported_action';
    END IF;
  END LOOP;
  RETURN NULL;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN 'invalid_configuration';
END $$;

-- Keep set_automation_rule_active signature & return type intact while verifying parent company active state.
CREATE OR REPLACE FUNCTION public.set_automation_rule_active(_company_id uuid, _rule_id uuid, _is_active boolean)
RETURNS public.automation_rules LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rule public.automation_rules;
  problem text;
BEGIN
  IF auth.uid() IS NULL OR public.is_company_owner(_company_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'company_owner_required' USING ERRCODE = '42501';
  END IF;
  IF _is_active IS NULL THEN RAISE EXCEPTION 'invalid_configuration' USING ERRCODE = '22023'; END IF;
  PERFORM 1 FROM public.companies WHERE id=_company_id FOR UPDATE;
  SELECT * INTO rule FROM public.automation_rules WHERE id=_rule_id AND company_id=_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'rule_not_found' USING ERRCODE = 'P0002'; END IF;
  IF _is_active THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id=_company_id AND c.status='active'
        AND (c.parent_company_id IS NULL OR EXISTS (
          SELECT 1 FROM public.companies parent WHERE parent.id=c.parent_company_id AND parent.status='active'
        ))
    ) THEN
      RAISE EXCEPTION 'company_inactive' USING ERRCODE = '22023';
    END IF;
    problem := automation_private.config_error(rule);
    IF problem IS NOT NULL THEN
      RAISE EXCEPTION '%', problem USING ERRCODE = '22023';
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

-- Update run_rules to preserve move_stage / assign_reviewer synchronously
-- and enqueue send_email / send_whatsapp / trigger_webhook safely in automation_outbound_queue.
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
        ELSIF action_type IN ('send_email', 'send_whatsapp', 'trigger_webhook') THEN
          -- Never duplicate raw webhook signing secrets into queue rows; worker reads secret from rule when needed.
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
        'invalid_email_recipient', 'invalid_whatsapp_recipient'
      ) THEN SQLERRM ELSE 'execution_failed' END;
      UPDATE public.automation_logs SET status='failed', execution_details=execution_details || jsonb_build_object('code', failure_code)
        WHERE id=log_id;
    END;
  END LOOP;
END $$;

-- Safe company/service-scoped enqueue RPC.
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

  IF _action_type NOT IN ('send_email', 'send_whatsapp', 'trigger_webhook') THEN
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

-- Service-only atomic queue claim RPC using SKIP LOCKED.
CREATE OR REPLACE FUNCTION public.claim_automation_outbound_queue(
  _company_id uuid DEFAULT NULL,
  _limit integer DEFAULT 25,
  _rule_id uuid DEFAULT NULL
)
RETURNS SETOF public.automation_outbound_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT q.id
    FROM public.automation_outbound_queue q
    JOIN public.companies c ON c.id = q.company_id AND c.status = 'active'
    WHERE q.status = 'pending'
      AND (q.locked_at IS NULL OR q.locked_at < clock_timestamp() - interval '5 minutes')
      AND q.attempt_count < 5
      AND (_company_id IS NULL OR q.company_id = _company_id)
      AND (_rule_id IS NULL OR q.rule_id = _rule_id)
      AND (
        c.parent_company_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.companies parent
          WHERE parent.id = c.parent_company_id AND parent.status = 'active'
        )
      )
    ORDER BY q.created_at ASC, q.id ASC
    LIMIT LEAST(GREATEST(COALESCE(_limit, 25), 1), 100)
    FOR UPDATE OF q SKIP LOCKED
  )
  UPDATE public.automation_outbound_queue q
  SET locked_at = clock_timestamp(),
      attempt_count = q.attempt_count + 1,
      updated_at = clock_timestamp()
  FROM claimed
  WHERE q.id = claimed.id
  RETURNING q.*;
END $$;

REVOKE ALL ON FUNCTION public.claim_automation_outbound_queue(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_automation_outbound_queue(uuid, integer, uuid) TO service_role;

-- Service-only queue item completion RPC that also rolls up outcome to automation_logs.
CREATE OR REPLACE FUNCTION public.complete_automation_outbound_item(
  _queue_id uuid,
  _status text,
  _last_error text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS public.automation_outbound_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_row public.automation_outbound_queue;
  pending_count integer;
  failed_count integer;
  skipped_count integer;
  final_log_status text;
  final_code text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF _status NOT IN ('dispatched', 'failed', 'skipped_unconfigured', 'pending') THEN
    RAISE EXCEPTION 'invalid_queue_status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.automation_outbound_queue
  SET status = _status,
      last_error = CASE WHEN _last_error IS NULL THEN NULL ELSE left(_last_error, 500) END,
      processed_at = CASE WHEN _status = 'pending' THEN NULL ELSE clock_timestamp() END,
      locked_at = NULL,
      updated_at = clock_timestamp()
  WHERE id = _queue_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'queue_item_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF updated_row.log_id IS NOT NULL THEN
    SELECT
      count(*) FILTER (WHERE status = 'pending'),
      count(*) FILTER (WHERE status = 'failed'),
      count(*) FILTER (WHERE status = 'skipped_unconfigured')
    INTO pending_count, failed_count, skipped_count
    FROM public.automation_outbound_queue
    WHERE log_id = updated_row.log_id;

    IF pending_count > 0 THEN
      final_log_status := 'running';
      final_code := COALESCE(_details->>'code', 'queued_outbound');
    ELSIF failed_count > 0 THEN
      final_log_status := 'failed';
      final_code := COALESCE(_details->>'code', 'execution_failed');
    ELSIF skipped_count > 0 THEN
      final_log_status := 'skipped';
      final_code := COALESCE(_details->>'code', 'WHATSAPP_PROVIDER_NOT_CONFIGURED');
    ELSE
      final_log_status := 'success';
      final_code := COALESCE(_details->>'code', 'completed');
    END IF;

    UPDATE public.automation_logs
    SET status = final_log_status,
        execution_details = execution_details
          || COALESCE(_details, '{}'::jsonb)
          || jsonb_build_object(
            'code', final_code,
            'outbound_status', _status
          )
    WHERE id = updated_row.log_id;
  END IF;

  RETURN updated_row;
END $$;

REVOKE ALL ON FUNCTION public.complete_automation_outbound_item(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_automation_outbound_item(uuid, text, text, jsonb) TO service_role;

-- Optional internal cron dispatcher (only fires when app.settings.supabase_url and a server secret exist; never uses anon_key).
CREATE OR REPLACE FUNCTION automation_private.dispatch_outbound_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_url text;
  worker_secret text;
  fn_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.automation_outbound_queue WHERE status = 'pending' LIMIT 1) THEN
    RETURN;
  END IF;

  base_url := NULLIF(btrim(current_setting('app.settings.supabase_url', true)), '');
  worker_secret := COALESCE(
    NULLIF(btrim(current_setting('app.settings.cron_secret', true)), ''),
    NULLIF(btrim(current_setting('app.settings.service_role_key', true)), '')
  );

  IF base_url IS NULL OR worker_secret IS NULL THEN
    RETURN;
  END IF;

  fn_url := rtrim(base_url, '/') || '/functions/v1/execute-automation-actions';

  IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL THEN
    PERFORM net.http_post(
      url := fn_url,
      body := '{"action":"process_queue","limit":25}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || worker_secret
      )
    );
  ELSIF to_regprocedure('extensions.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := fn_url,
      body := '{"action":"process_queue","limit":25}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || worker_secret
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA automation_private FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL THEN
    PERFORM cron.schedule('automation-outbound-queue', '* * * * *', 'SELECT automation_private.dispatch_outbound_worker();');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
