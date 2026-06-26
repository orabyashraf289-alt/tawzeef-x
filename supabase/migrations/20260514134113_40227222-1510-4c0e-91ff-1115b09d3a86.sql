
-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  logo_url text,
  contact_email text,
  contact_phone text,
  website text,
  industry text,
  country text DEFAULT 'SA',
  city text,
  owner_user_id uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'hr',
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AGENCIES
-- ============================================================
CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  license_number text,
  contact_email text,
  contact_phone text,
  country text DEFAULT 'SA',
  city text,
  logo_url text,
  owner_user_id uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agency_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role text NOT NULL DEFAULT 'officer',
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);
CREATE INDEX idx_agency_members_user ON public.agency_members(user_id);
CREATE INDEX idx_agency_members_agency ON public.agency_members(agency_id);
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agency_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id uuid,
  scope text NOT NULL DEFAULT 'company',
  assigned_by uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agency_assignments_agency ON public.agency_assignments(agency_id);
CREATE INDEX idx_agency_assignments_company ON public.agency_assignments(company_id);
CREATE INDEX idx_agency_assignments_candidate ON public.agency_assignments(candidate_id);
ALTER TABLE public.agency_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CHECKLIST TEMPLATES & CANDIDATE CHECKLISTS
-- ============================================================
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.candidate_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  template_key text,
  status text NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidate_checklists_candidate ON public.candidate_checklists(candidate_id);
CREATE INDEX idx_candidate_checklists_company ON public.candidate_checklists(company_id);
ALTER TABLE public.candidate_checklists ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.candidate_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.candidate_checklists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  sort_order integer NOT NULL DEFAULT 0,
  assigned_to_type text DEFAULT 'recruiter',
  assigned_to_user_id uuid,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_items_checklist ON public.candidate_checklist_items(checklist_id);
ALTER TABLE public.candidate_checklist_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ADD company_id / agency_id COLUMNS TO EXISTING TABLES
-- ============================================================
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.job_offers ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS company_id uuid;

CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_company ON public.candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_agency ON public.candidates(agency_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company ON public.interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_offers_company ON public.job_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_assessments_company ON public.assessments(company_id);

-- ============================================================
-- SECURITY DEFINER HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.has_agency_access(_agency_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE agency_id = _agency_id AND user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = auth.uid() AND member_role = 'owner'
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_agencies()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.candidate_has_agency_access(_candidate_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.agency_members am ON am.agency_id = c.agency_id
    WHERE c.id = _candidate_id AND am.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.agency_assignments aa ON aa.candidate_id = c.id
    JOIN public.agency_members am ON am.agency_id = aa.agency_id
    WHERE c.id = _candidate_id AND am.user_id = auth.uid() AND aa.status = 'active'
  );
$$;

-- Grant execute to authenticated only
REVOKE ALL ON FUNCTION public.has_company_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_agency_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_companies() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_agencies() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.candidate_has_agency_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_agency_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_companies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_agencies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_has_agency_access(uuid) TO authenticated;

-- ============================================================
-- RLS POLICIES
-- ============================================================
-- Companies
CREATE POLICY "Admins manage all companies" ON public.companies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (public.has_company_access(id));

CREATE POLICY "Owners update own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_company_owner(id))
  WITH CHECK (public.is_company_owner(id));

-- Company members
CREATE POLICY "Admins manage company members" ON public.company_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners manage their company members" ON public.company_members
  FOR ALL TO authenticated
  USING (public.is_company_owner(company_id))
  WITH CHECK (public.is_company_owner(company_id));

CREATE POLICY "Members view own company members" ON public.company_members
  FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

-- Agencies
CREATE POLICY "Admins manage agencies" ON public.agencies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agency members view own agency" ON public.agencies
  FOR SELECT TO authenticated
  USING (public.has_agency_access(id));

-- Agency members
CREATE POLICY "Admins manage agency members" ON public.agency_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members view own agency members" ON public.agency_members
  FOR SELECT TO authenticated
  USING (public.has_agency_access(agency_id));

-- Agency assignments
CREATE POLICY "Admins manage agency assignments" ON public.agency_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agency members view their assignments" ON public.agency_assignments
  FOR SELECT TO authenticated
  USING (public.has_agency_access(agency_id) OR public.has_company_access(company_id));

CREATE POLICY "Company owners manage their assignments" ON public.agency_assignments
  FOR ALL TO authenticated
  USING (public.is_company_owner(company_id))
  WITH CHECK (public.is_company_owner(company_id));

-- Checklist templates (read-only for authenticated, admin manages)
CREATE POLICY "Authenticated can view active templates" ON public.checklist_templates
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins manage templates" ON public.checklist_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Candidate checklists
CREATE POLICY "Company members manage checklists" ON public.candidate_checklists
  FOR ALL TO authenticated
  USING (public.has_company_access(company_id))
  WITH CHECK (public.has_company_access(company_id));

CREATE POLICY "Agency members view assigned checklists" ON public.candidate_checklists
  FOR SELECT TO authenticated
  USING (public.candidate_has_agency_access(candidate_id));

-- Checklist items
CREATE POLICY "Company members manage checklist items" ON public.candidate_checklist_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidate_checklists cc
    WHERE cc.id = checklist_id AND public.has_company_access(cc.company_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.candidate_checklists cc
    WHERE cc.id = checklist_id AND public.has_company_access(cc.company_id)
  ));

CREATE POLICY "Agency members manage assigned items" ON public.candidate_checklist_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidate_checklists cc
    WHERE cc.id = checklist_id AND public.candidate_has_agency_access(cc.candidate_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.candidate_checklists cc
    WHERE cc.id = checklist_id AND public.candidate_has_agency_access(cc.candidate_id)
  ));

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_agencies_updated BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_agency_assignments_updated BEFORE UPDATE ON public.agency_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_checklist_templates_updated BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_candidate_checklists_updated BEFORE UPDATE ON public.candidate_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_checklist_items_updated BEFORE UPDATE ON public.candidate_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- DATA MIGRATION: Backfill companies for existing recruiters
-- ============================================================
DO $$
DECLARE
  rec RECORD;
  new_company_id uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT ur.user_id, p.company_name, p.full_name, p.company_logo,
           (SELECT email FROM auth.users WHERE id = ur.user_id) AS email
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role IN ('recruiter','admin','reviewer')
  LOOP
    -- Skip if user already has a company as owner
    IF EXISTS (SELECT 1 FROM public.company_members WHERE user_id = rec.user_id AND member_role = 'owner') THEN
      CONTINUE;
    END IF;

    INSERT INTO public.companies (name, logo_url, contact_email, owner_user_id, status)
    VALUES (
      COALESCE(NULLIF(trim(rec.company_name), ''), NULLIF(trim(rec.full_name), ''), rec.email, 'شركة بدون اسم'),
      NULLIF(rec.company_logo, ''),
      rec.email,
      rec.user_id,
      'active'
    )
    RETURNING id INTO new_company_id;

    INSERT INTO public.company_members (company_id, user_id, member_role)
    VALUES (new_company_id, rec.user_id, 'owner');

    -- Backfill all related rows owned by this user
    UPDATE public.jobs SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.candidates SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.interviews SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.job_offers SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
    UPDATE public.assessments SET company_id = new_company_id WHERE user_id = rec.user_id AND company_id IS NULL;
  END LOOP;

  -- Backfill applications via jobs
  UPDATE public.applications a
  SET company_id = j.company_id
  FROM public.jobs j
  WHERE a.job_id = j.id AND a.company_id IS NULL AND j.company_id IS NOT NULL;
END $$;

-- ============================================================
-- DEFAULT CHECKLIST TEMPLATES
-- ============================================================
INSERT INTO public.checklist_templates (key, name_ar, name_en, description, items, is_default) VALUES
('saudi_deployment', 'الانتداب للسعودية', 'Saudi Deployment', 'قائمة متابعة كاملة لإجراءات نقل المرشح للسعودية',
'[
  {"title":"التحاليل الطبية","description":"الفحص الطبي المعتمد من مكاتب موافقة"},
  {"title":"إصدار/تجديد جواز السفر","description":"التأكد من سريان جواز السفر لمدة 6 أشهر على الأقل"},
  {"title":"تجهيز المستندات","description":"شهادات الخبرة والمؤهلات والصور الشخصية"},
  {"title":"التصديق من الخارجية","description":"تصديق المستندات من وزارة الخارجية"},
  {"title":"التصديق من السفارة السعودية","description":"اعتماد المستندات من السفارة"},
  {"title":"إصدار التأشيرة","description":"تقديم طلب التأشيرة ومتابعتها"},
  {"title":"حجز التذكرة","description":"حجز تذكرة السفر وإرسال التفاصيل"},
  {"title":"الاستقبال في المملكة","description":"تنسيق الاستقبال في المطار"},
  {"title":"إجراءات الإقامة","description":"إصدار الإقامة وفتح الحساب البنكي"}
]'::jsonb, true),
('basic_onboarding', 'تأهيل أساسي', 'Basic Onboarding', 'قائمة تأهيل أساسية للموظف الجديد',
'[
  {"title":"توقيع العقد","description":""},
  {"title":"تسليم المستندات الرسمية","description":""},
  {"title":"الفحص الطبي","description":""},
  {"title":"تجهيز مكان العمل","description":""},
  {"title":"التدريب التعريفي","description":""}
]'::jsonb, false);
