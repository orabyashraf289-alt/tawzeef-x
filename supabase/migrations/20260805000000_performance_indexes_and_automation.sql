-- Migration: Performance Composite Indexes & Workflow Automation Engine Tables
-- Date: 2026-08-05

-- 1. Performance Composite Indexes for Ultra-Fast Multi-Tenant Queries
CREATE INDEX IF NOT EXISTS idx_candidates_company_job_stage ON public.candidates(company_id, job_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_candidates_company_created ON public.candidates(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON public.jobs(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_company_candidate ON public.applications(company_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_company_status ON public.job_offers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_company_members_company_user ON public.company_members(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company_job ON public.interviews(company_id, job_id);

-- 2. Create Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(100) NOT NULL, -- e.g., 'candidate.stage_changed', 'application.created', 'offer.sent', 'sla.expired'
  conditions JSONB DEFAULT '[]'::jsonb, -- Array of condition objects { field, operator, value }
  actions JSONB DEFAULT '[]'::jsonb,   -- Array of action objects { type, payload }
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Automation Execution Logs Table
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  trigger_event VARCHAR(100) NOT NULL,
  entity_id UUID, -- Candidate ID / Job ID / Application ID
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed', 'skipped'
  execution_details JSONB DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for automation_rules
CREATE POLICY "Company members can view automation rules"
  ON public.automation_rules FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage automation rules"
  ON public.automation_rules FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );

-- 6. RLS Policies for automation_logs
CREATE POLICY "Company members can view automation logs"
  ON public.automation_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    )
  );
