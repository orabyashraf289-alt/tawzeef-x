-- Reissue automation storage with tenant-scoped permissions and server-only execution.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE INDEX idx_candidates_company_job_stage ON public.candidates(company_id, job_id, stage);
CREATE INDEX idx_candidates_company_created ON public.candidates(company_id, created_at DESC);
CREATE INDEX idx_jobs_company_status ON public.jobs(company_id, status, created_at DESC);
CREATE INDEX idx_applications_company_job ON public.applications(company_id, job_id);
CREATE INDEX idx_job_offers_company_status ON public.job_offers(company_id, status);
CREATE INDEX idx_interviews_company_candidate ON public.interviews(company_id, candidate_id);
-- company_members(company_id, user_id) already has a unique constraint.

CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL CHECK (length(btrim(title)) > 0),
  description text,
  trigger_event varchar(100) NOT NULL CHECK (trigger_event IN (
    'candidate.stage_changed', 'application.created', 'offer.sent', 'sla.expired'
  )),
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(conditions) = 'array'),
  actions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(actions) = 'array'),
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_rules_company_id_key UNIQUE (company_id, id)
);

CREATE INDEX automation_rules_company_created_idx
  ON public.automation_rules(company_id, created_at DESC);

CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id uuid,
  trigger_event varchar(100) NOT NULL,
  entity_id uuid,
  status varchar(50) NOT NULL DEFAULT 'success',
  execution_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_logs_rule_scope_fkey FOREIGN KEY (company_id, rule_id)
    REFERENCES public.automation_rules(company_id, id) ON DELETE CASCADE
);

CREATE INDEX automation_logs_company_executed_idx
  ON public.automation_logs(company_id, executed_at DESC);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_rules, public.automation_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.automation_rules TO authenticated;
GRANT INSERT (company_id, title, description, trigger_event, conditions, actions, created_by)
  ON public.automation_rules TO authenticated;
GRANT UPDATE (title, description, trigger_event, conditions, actions, updated_at)
  ON public.automation_rules TO authenticated;
GRANT SELECT ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_rules, public.automation_logs TO service_role;

CREATE POLICY "Company members view automation rules" ON public.automation_rules
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
CREATE POLICY "Company owners create automation drafts" ON public.automation_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_owner(company_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "Company owners update automation drafts" ON public.automation_rules
  FOR UPDATE TO authenticated
  USING (public.is_company_owner(company_id)) WITH CHECK (public.is_company_owner(company_id));
CREATE POLICY "Company owners delete automation drafts" ON public.automation_rules
  FOR DELETE TO authenticated USING (public.is_company_owner(company_id));
CREATE POLICY "Company members view automation logs" ON public.automation_logs
  FOR SELECT TO authenticated USING (public.has_company_access(company_id));
