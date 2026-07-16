
-- =========================================================================
-- MISSING TABLES: webhook_endpoints and webhook_deliveries
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own webhook endpoints') THEN
    CREATE POLICY "Users manage own webhook endpoints" ON public.webhook_endpoints FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own webhook deliveries') THEN
    CREATE POLICY "Users view own webhook deliveries" ON public.webhook_deliveries FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;



-- =========================================================================
-- MIGRATION: 20260213094912_3321bb95-fb16-4fb9-80c6-ba3f810c9754.sql
-- =========================================================================


-- Profiles table for authenticated users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'recruiter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'نشطة',
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT,
  requirements TEXT[],
  experience_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own jobs" ON public.jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Public read for apply page
CREATE POLICY "Anyone can view active jobs" ON public.jobs FOR SELECT USING (status = 'نشطة');
CREATE TRIGGER update_jobs_ts BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  experience TEXT,
  status TEXT NOT NULL DEFAULT 'قيد المراجعة',
  rating INTEGER DEFAULT 0,
  skills TEXT[],
  education TEXT,
  summary TEXT,
  location TEXT,
  source TEXT DEFAULT 'الموقع',
  stage TEXT DEFAULT 'تقديم الطلب',
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own candidates" ON public.candidates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_candidates_ts BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  position TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  type TEXT NOT NULL DEFAULT 'عن بُعد',
  interviewer TEXT,
  status TEXT NOT NULL DEFAULT 'مجدولة',
  rating INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own interviews" ON public.interviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_interviews_ts BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  description TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public applications (no auth needed)
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  experience TEXT,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT NOT NULL DEFAULT 'جديد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
-- Anyone can submit an application
CREATE POLICY "Anyone can submit applications" ON public.applications FOR INSERT WITH CHECK (true);
-- Job owner can view applications
CREATE POLICY "Job owners can view applications" ON public.applications FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = applications.job_id AND jobs.user_id = auth.uid()));


-- =========================================================================
-- MIGRATION: 20260309025632_38e18d15-94fc-4597-a81e-71025b1bbb14.sql
-- =========================================================================


ALTER TABLE public.candidates
ADD COLUMN ai_score integer DEFAULT NULL,
ADD COLUMN ai_evaluation text DEFAULT NULL;


-- =========================================================================
-- MIGRATION: 20260309030003_21d8bf0c-d890-4f59-bb16-c91294c6b607.sql
-- =========================================================================


ALTER TABLE public.candidates
ADD COLUMN tracking_code text DEFAULT NULL UNIQUE;

-- Generate tracking codes for existing candidates
UPDATE public.candidates
SET tracking_code = UPPER(SUBSTR(md5(random()::text || id::text), 1, 8))
WHERE tracking_code IS NULL;

-- Create trigger to auto-generate tracking code for new candidates
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := UPPER(SUBSTR(md5(random()::text || NEW.id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tracking_code
  BEFORE INSERT ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tracking_code();


-- =========================================================================
-- MIGRATION: 20260309031929_701d2384-a821-4bd1-a8af-8bf1c72837b8.sql
-- =========================================================================


-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'recruiter', 'reviewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Admins can manage all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-assign 'recruiter' role on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'recruiter');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();


-- =========================================================================
-- MIGRATION: 20260309032814_a9fa1039-dbb1-4aa3-9184-522f3f3a927f.sql
-- =========================================================================


-- Invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'recruiter',
  token text NOT NULL DEFAULT UPPER(SUBSTR(md5(random()::text || gen_random_uuid()::text), 1, 12)),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Activity log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity, users can view their own
CREATE POLICY "Admins can view all activity"
ON public.activity_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own activity"
ON public.activity_log
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone authenticated can insert activity
CREATE POLICY "Authenticated users can log activity"
ON public.activity_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to auto-assign role from invitation on signup
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM public.invitations 
  WHERE email = NEW.email AND status = 'pending' AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    -- Update user role to the invited role
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, inv.role);
    
    -- Mark invitation as accepted
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_check_invitation
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_signup();


-- =========================================================================
-- MIGRATION: 20260309033919_70de47b5-5c87-42f1-8b78-2790dca48546.sql
-- =========================================================================


-- Table to store editable permissions per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL,
  description text,
  admin boolean NOT NULL DEFAULT true,
  recruiter boolean NOT NULL DEFAULT false,
  reviewer boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage permissions"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read permissions (needed to enforce them)
CREATE POLICY "Authenticated users can read permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Seed default permissions
INSERT INTO public.role_permissions (permission_key, description, admin, recruiter, reviewer) VALUES
  ('الوظائف', 'إنشاء وتعديل وحذف الوظائف', true, true, false),
  ('المرشحون', 'عرض وإدارة المرشحين', true, true, true),
  ('مسار التوظيف', 'تحريك المرشحين بين المراحل', true, true, false),
  ('المقابلات', 'جدولة وإدارة المقابلات', true, true, true),
  ('التقارير', 'عرض التقارير والإحصائيات', true, true, false),
  ('مساعد AI', 'استخدام المساعد الذكي', true, true, false),
  ('إدارة الفريق', 'إدارة المستخدمين والأدوار', true, false, false),
  ('الإعدادات', 'تغيير إعدادات النظام', true, false, false),
  ('الدعوات', 'دعوة مستخدمين جدد', true, false, false),
  ('تقييم المرشحين', 'إضافة تقييمات ومراجعات', true, true, true),
  ('حذف البيانات', 'حذف المرشحين والوظائف', true, false, false),
  ('تصدير البيانات', 'تصدير التقارير والبيانات', true, true, false);


-- =========================================================================
-- MIGRATION: 20260309042639_17b41ac2-e393-42d6-a907-c75046d52e49.sql
-- =========================================================================


-- Allow service role to insert webhook deliveries (already has RLS bypass)
-- But also allow authenticated users to insert via edge function context
CREATE POLICY "Service can insert webhook deliveries"
ON public.webhook_deliveries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create function to dispatch webhooks on candidate status change
CREATE OR REPLACE FUNCTION public.dispatch_candidate_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'candidate.status_changed',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'candidate_id', NEW.id,
          'candidate_name', NEW.name,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'role', NEW.role,
          'email', NEW.email
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to dispatch webhooks on job status change
CREATE OR REPLACE FUNCTION public.dispatch_job_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'job.status_changed',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'job_id', NEW.id,
          'job_title', NEW.title,
          'department', NEW.department,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers
CREATE TRIGGER on_candidate_status_change
AFTER UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_candidate_webhook();

CREATE TRIGGER on_job_status_change
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_job_webhook();


-- =========================================================================
-- MIGRATION: 20260309043058_cbbc2d33-793a-4516-bc73-6082f1bbb6b8.sql
-- =========================================================================


-- Job Offers table for managing employment offers
CREATE TABLE public.job_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  
  -- Offer details
  position text NOT NULL,
  department text,
  salary numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  start_date date,
  offer_type text NOT NULL DEFAULT 'full-time', -- full-time, part-time, contract
  benefits text[],
  additional_terms text,
  
  -- Tracking
  status text NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired, withdrawn
  token text NOT NULL DEFAULT upper(substr(md5(random()::text || gen_random_uuid()::text), 1, 16)),
  
  -- Candidate response
  response_date timestamp with time zone,
  response_notes text,
  signature_url text,
  
  -- Expiry
  expires_at timestamp with time zone,
  
  -- Timestamps
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own offers
CREATE POLICY "Users can manage own offers"
ON public.job_offers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update timestamp trigger
CREATE TRIGGER on_job_offers_updated
BEFORE UPDATE ON public.job_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Webhook trigger for offer status changes
CREATE OR REPLACE FUNCTION public.dispatch_offer_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'offer.status_changed',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'offer_id', NEW.id,
          'position', NEW.position,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'candidate_id', NEW.candidate_id
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_offer_status_change
AFTER UPDATE ON public.job_offers
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_offer_webhook();


-- =========================================================================
-- MIGRATION: 20260309043325_b75aad0e-fa1c-4e7c-bcc9-8be73119d76e.sql
-- =========================================================================


-- Allow public access to offers via token (for candidate portal)
CREATE POLICY "Public can view offers by token"
ON public.job_offers
FOR SELECT
USING (true);

-- Allow public to update offer status via token (accept/reject)
CREATE POLICY "Public can respond to offers"
ON public.job_offers
FOR UPDATE
USING (status IN ('sent', 'viewed'))
WITH CHECK (status IN ('viewed', 'accepted', 'rejected'));


-- =========================================================================
-- MIGRATION: 20260309045306_42fa33c7-f978-4280-97f1-ea13be67f095.sql
-- =========================================================================

ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS meeting_url text;

-- =========================================================================
-- MIGRATION: 20260309045810_7dbe2096-eb76-4777-b8ed-d7661268c4be.sql
-- =========================================================================

-- Add transcript and recording columns to interviews
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS recording_url text;

-- Create storage bucket for interview recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('interview-recordings', 'interview-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own recordings
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'interview-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================================
-- MIGRATION: 20260309160208_2447dbe2-a203-42b7-a78b-412a50152ad6.sql
-- =========================================================================


CREATE OR REPLACE FUNCTION public.handle_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _job RECORD;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = NEW.job_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.candidates (
    user_id, name, email, phone, role, experience, 
    summary, stage, status, source, job_id
  ) VALUES (
    _job.user_id,
    NEW.name,
    NEW.email,
    NEW.phone,
    _job.title,
    NEW.experience,
    NEW.cover_letter,
    'تقديم الطلب',
    'قيد المراجعة',
    'نموذج التقديم',
    _job.id
  );

  INSERT INTO public.notifications (user_id, title, description, type)
  VALUES (
    _job.user_id,
    'طلب توظيف جديد: ' || NEW.name,
    'تقدم ' || NEW.name || ' لوظيفة ' || _job.title,
    'application'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_application
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_application();


-- =========================================================================
-- MIGRATION: 20260311020345_77f21027-02a8-4ef5-9f70-dc28e1bf6a2c.sql
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =========================================================================
-- MIGRATION: 20260311020417_8981fa95-614c-44f3-9224-b5d97b32feca.sql
-- =========================================================================

CREATE OR REPLACE FUNCTION public.dispatch_candidate_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      PERFORM extensions.http_post(
        url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
        body := jsonb_build_object(
          'event_type', 'candidate.status_changed',
          'user_id', NEW.user_id,
          'payload', jsonb_build_object(
            'candidate_id', NEW.id,
            'candidate_name', NEW.name,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'role', NEW.role,
            'email', NEW.email
          )
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently continue if webhook dispatch fails
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================================
-- MIGRATION: 20260312113317_0ab31ac2-d10d-4fc9-85e9-6a588c7c86c1.sql
-- =========================================================================

DROP TRIGGER IF EXISTS on_offer_status_change ON public.job_offers;

-- =========================================================================
-- MIGRATION: 20260313114205_b4dc9129-362f-43dd-ae16-477e84195086.sql
-- =========================================================================

CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  smtp_host text NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port integer NOT NULL DEFAULT 465,
  smtp_secure boolean NOT NULL DEFAULT true,
  smtp_user text NOT NULL,
  smtp_password text NOT NULL,
  sender_name text NOT NULL DEFAULT 'فريق التوظيف',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own email settings"
  ON public.email_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can read email settings"
  ON public.email_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================================================
-- MIGRATION: 20260313114213_ce3361e9-b2fc-48ac-8903-20f1549d295e.sql
-- =========================================================================

DROP POLICY "Service can read email settings" ON public.email_settings;

-- =========================================================================
-- MIGRATION: 20260313121116_e6e45bc8-c142-4f56-976a-953ec119a06e.sql
-- =========================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =========================================================================
-- MIGRATION: 20260316010926_51af9a58-328f-4d47-ac6a-1e6870ef9efa.sql
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =========================================================================
-- MIGRATION: 20260316032425_4cb05d41-b6ae-446d-b4d0-7db882389051.sql
-- =========================================================================


-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);

-- Allow anyone to upload resumes
CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'resumes');

-- Allow anyone to read resumes
CREATE POLICY "Anyone can read resumes" ON storage.objects FOR SELECT TO public USING (bucket_id = 'resumes');


-- =========================================================================
-- MIGRATION: 20260316040302_ce58b40c-9bf8-4663-8a8b-946116315722.sql
-- =========================================================================


-- Add resume_url column to candidates table
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS resume_url text;

-- Update the handle_new_application function to pass resume_url
CREATE OR REPLACE FUNCTION public.handle_new_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = NEW.job_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.candidates (
    user_id, name, email, phone, role, experience, 
    summary, stage, status, source, job_id, resume_url
  ) VALUES (
    _job.user_id,
    NEW.name,
    NEW.email,
    NEW.phone,
    _job.title,
    NEW.experience,
    NEW.cover_letter,
    'تقديم الطلب',
    'قيد المراجعة',
    'نموذج التقديم',
    _job.id,
    NEW.resume_url
  );

  INSERT INTO public.notifications (user_id, title, description, type)
  VALUES (
    _job.user_id,
    'طلب توظيف جديد: ' || NEW.name,
    'تقدم ' || NEW.name || ' لوظيفة ' || _job.title,
    'application'
  );

  RETURN NEW;
END;
$function$;


-- =========================================================================
-- MIGRATION: 20260316041134_e421756c-f880-4664-8e3d-57aae48e6368.sql
-- =========================================================================


CREATE TABLE public.hiring_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hire_target integer NOT NULL DEFAULT 10,
  candidates_target integer NOT NULL DEFAULT 50,
  interviews_target integer NOT NULL DEFAULT 20,
  offers_target integer NOT NULL DEFAULT 8,
  month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.hiring_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hiring goals"
ON public.hiring_goals
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_hiring_goals_updated_at
  BEFORE UPDATE ON public.hiring_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- =========================================================================
-- MIGRATION: 20260318112906_7a84c386-2bf0-4ef0-be1c-84ded533724e.sql
-- =========================================================================


-- Add job_seeker to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'job_seeker';


-- =========================================================================
-- MIGRATION: 20260318112931_88458f6f-436a-42ed-a7be-8a16a7ef0e4e.sql
-- =========================================================================


-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  billing_period text NOT NULL DEFAULT 'monthly',
  job_posts_limit integer NOT NULL DEFAULT 2,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Company subscriptions table
CREATE TABLE public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  job_posts_used integer NOT NULL DEFAULT 0,
  job_posts_limit integer NOT NULL DEFAULT 2,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.company_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.company_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" ON public.company_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.company_subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default plans
INSERT INTO public.subscription_plans (name, name_ar, description, price, job_posts_limit, sort_order, features) VALUES
  ('free', 'مجاني', 'للشركات الصغيرة والمبتدئة', 0, 2, 1, '["إنشاء 2 منشور توظيف", "إدارة المرشحين الأساسية", "لوحة تحكم بسيطة"]'::jsonb),
  ('basic', 'أساسي', 'للشركات المتوسطة', 199, 10, 2, '["إنشاء 10 منشورات توظيف", "تقييم AI للمرشحين", "تقارير متقدمة", "دعم بالبريد الإلكتروني"]'::jsonb),
  ('pro', 'احترافي', 'للشركات الكبيرة', 499, -1, 3, '["منشورات توظيف غير محدودة", "تقييم AI متقدم", "تقارير تفصيلية", "دعم أولوية 24/7", "عروض رقمية", "Webhooks"]'::jsonb);

-- Update handle_new_user_role to assign job_seeker role based on signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _account_type text;
BEGIN
  _account_type := NEW.raw_user_meta_data->>'account_type';
  
  IF _account_type = 'job_seeker' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'job_seeker');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'recruiter');
    -- Auto-create free subscription for company owners
    INSERT INTO public.company_subscriptions (user_id, plan_id, job_posts_limit)
    SELECT NEW.id, id, 2 FROM public.subscription_plans WHERE name = 'free' LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;


-- =========================================================================
-- MIGRATION: 20260318113326_c833a196-c760-49e4-9f6e-25426ce80dcb.sql
-- =========================================================================


CREATE OR REPLACE FUNCTION public.increment_job_posts_used(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.company_subscriptions
  SET job_posts_used = job_posts_used + 1, updated_at = now()
  WHERE user_id = _user_id;
END;
$$;


-- =========================================================================
-- MIGRATION: 20260318121520_196006d7-2c3b-4f13-9369-abd7c7649436.sql
-- =========================================================================


CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL DEFAULT '',
  job_title text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  location text DEFAULT '',
  summary text DEFAULT '',
  experience jsonb DEFAULT '[]'::jsonb,
  education jsonb DEFAULT '[]'::jsonb,
  skills text[] DEFAULT '{}',
  languages jsonb DEFAULT '[]'::jsonb,
  certifications jsonb DEFAULT '[]'::jsonb,
  links jsonb DEFAULT '[]'::jsonb,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own resume" ON public.resumes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON public.resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =========================================================================
-- MIGRATION: 20260318202613_3fd3e275-34ce-4ebf-b733-ac95c52c0c8b.sql
-- =========================================================================


CREATE OR REPLACE FUNCTION public.dispatch_job_created_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM extensions.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'job.created',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'job_id', NEW.id,
          'job_title', NEW.title,
          'department', NEW.department,
          'location', NEW.location,
          'type', NEW.type,
          'description', NEW.description,
          'experience_level', NEW.experience_level,
          'salary_min', NEW.salary_min,
          'salary_max', NEW.salary_max
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_job_created
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_job_created_webhook();


-- =========================================================================
-- MIGRATION: 20260319135712_fe4a84dc-651e-4d9d-a13c-cb7dc11b9851.sql
-- =========================================================================


-- Add skills and specialty to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS specialty text DEFAULT NULL;


-- =========================================================================
-- MIGRATION: 20260319140326_064eb2c0-35f2-479e-a297-08e3632d930f.sql
-- =========================================================================


-- Allow job seekers to view their own applications by matching email
CREATE POLICY "Applicants can view own applications"
ON public.applications FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow job seekers to view their own candidate records by matching email
CREATE POLICY "Job seekers can view own candidate records"
ON public.candidates FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow job seekers to view their own interviews via candidate records
CREATE POLICY "Job seekers can view own interviews"
ON public.interviews FOR SELECT
TO authenticated
USING (candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
));


-- =========================================================================
-- MIGRATION: 20260319194650_8c539580-4b3f-4280-a374-4993bba9bd77.sql
-- =========================================================================


-- Table to store LinkedIn Zapier webhook URL per user
CREATE TABLE public.linkedin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  zapier_webhook_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.linkedin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own linkedin settings"
ON public.linkedin_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_linkedin_settings_updated_at
BEFORE UPDATE ON public.linkedin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- =========================================================================
-- MIGRATION: 20260319200449_f1a69ef1-2f45-42a5-928c-7534baae0408.sql
-- =========================================================================


-- Table to log LinkedIn/Zapier webhook delivery attempts
CREATE TABLE public.linkedin_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  status_code integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own linkedin deliveries"
ON public.linkedin_deliveries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert linkedin deliveries"
ON public.linkedin_deliveries FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_linkedin_deliveries_user_created ON public.linkedin_deliveries (user_id, created_at DESC);


-- =========================================================================
-- MIGRATION: 20260322233012_9e561944-a97c-40f9-8ac7-51ca3220a001.sql
-- =========================================================================


-- Fix candidates RLS: replace auth.users reference with auth.jwt()
DROP POLICY IF EXISTS "Job seekers can view own candidate records" ON public.candidates;
CREATE POLICY "Job seekers can view own candidate records"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email')::text);

-- Fix interviews RLS: replace auth.users subquery with auth.jwt()
DROP POLICY IF EXISTS "Job seekers can view own interviews" ON public.interviews;
CREATE POLICY "Job seekers can view own interviews"
  ON public.interviews
  FOR SELECT
  TO authenticated
  USING (candidate_id IN (
    SELECT c.id FROM public.candidates c
    WHERE c.email = (auth.jwt() ->> 'email')::text
  ));


-- =========================================================================
-- MIGRATION: 20260323085356_904571a5-4802-41cb-8cfa-b78c9c6097f3.sql
-- =========================================================================


-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO public
USING (has_role(auth.uid(), 'admin'::app_role));


-- =========================================================================
-- MIGRATION: 20260323091012_bc507394-98f3-462d-bbee-bf8a75c212e3.sql
-- =========================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text DEFAULT '';

-- =========================================================================
-- MIGRATION: 20260323091026_1c89600b-7140-4627-a639-c757888588b4.sql
-- =========================================================================


INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');


-- =========================================================================
-- MIGRATION: 20260323100021_b1b40c52-474b-4190-9247-5d68473fa939.sql
-- =========================================================================


CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'محادثة جديدة',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations" ON public.chat_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- =========================================================================
-- MIGRATION: 20260327022036_d333b8c1-f3ef-4d0a-b38e-8b9bb70dffd1.sql
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.login_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_otp_challenges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_otp_challenges_email_created_at
  ON public.login_otp_challenges (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_otp_challenges_user_created_at
  ON public.login_otp_challenges (user_id, created_at DESC);

-- =========================================================================
-- MIGRATION: 20260327022055_5409af16-1c59-44f4-b1c7-5c3e778b79ea.sql
-- =========================================================================

CREATE POLICY "No client access to login otp challenges"
ON public.login_otp_challenges
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- =========================================================================
-- MIGRATION: 20260327024040_bc8782d5-280a-4c43-aade-628106324d7c.sql
-- =========================================================================


-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule cleanup of expired/consumed OTP challenges every hour
SELECT cron.schedule(
  'cleanup-expired-otp-challenges',
  '0 * * * *',
  $$DELETE FROM public.login_otp_challenges WHERE consumed_at IS NOT NULL OR expires_at < now() - interval '1 hour'$$
);


-- =========================================================================
-- MIGRATION: 20260327024057_87783d5a-8ca5-4a50-9c3e-e770146882a2.sql
-- =========================================================================


-- Fix 1: applications table - restrict INSERT to only allow via anon (public form) but require job_id to exist
-- The current "Anyone can submit applications" WITH CHECK (true) is intentional for public job application forms
-- But we should at least validate the job exists and is active
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applications;
CREATE POLICY "Anyone can submit applications" ON public.applications
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND status = 'نشطة')
  );

-- Fix 2: linkedin_deliveries - restrict INSERT to service role only (edge functions use service key)
-- Change from WITH CHECK (true) to requiring user_id match
DROP POLICY IF EXISTS "Service can insert linkedin deliveries" ON public.linkedin_deliveries;
CREATE POLICY "Service can insert linkedin deliveries" ON public.linkedin_deliveries
  FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- MIGRATION: 20260327030618_a7949352-0782-4cc1-8677-a3e2b8cb7f3c.sql
-- =========================================================================


CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  user_email text,
  ip_address text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_audit_log_event_type ON public.audit_log (event_type);
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);


-- =========================================================================
-- MIGRATION: 20260327030627_fb12a8cc-f135-4d08-bd4e-40fb558367c7.sql
-- =========================================================================


DROP POLICY "System can insert audit log" ON public.audit_log;

CREATE POLICY "Authenticated users can insert audit log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can insert audit log"
  ON public.audit_log FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);


-- =========================================================================
-- MIGRATION: 20260327050859_c1340634-18a1-48ad-85c4-8ab1ff598b2b.sql
-- =========================================================================

-- Talent Pool table
CREATE TABLE public.talent_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, candidate_id)
);

ALTER TABLE public.talent_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own talent pool"
  ON public.talent_pool
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- MIGRATION: 20260327134603_c39aa512-f804-436d-8776-643183e4af30.sql
-- =========================================================================


-- ============================================================
-- FIX 1: Prevent privilege escalation on user_roles
-- Drop the overly permissive ALL policy and replace with specific policies
-- ============================================================

-- Drop the existing ALL policy that allows any admin (but also INSERT for non-admins)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Admin SELECT: admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT: only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin UPDATE: only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin DELETE: only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FIX 2: Restrict public access to job_offers
-- Replace the "USING: true" SELECT policy with token-based access
-- ============================================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view offers by token" ON public.job_offers;

-- New policy: public can only view offers when querying by a specific token
-- This uses the request headers/params pattern - offers are only accessible 
-- when filtered by token column (the RLS ensures rows are only visible to owner or via token match)
CREATE POLICY "Public can view offers by token"
ON public.job_offers
FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = user_id
  OR status IN ('sent', 'viewed', 'accepted', 'rejected')
);


-- =========================================================================
-- MIGRATION: 20260327134659_8724f9db-98d2-4d68-a2bc-82fbffee7464.sql
-- =========================================================================


-- ============================================================
-- FIX job_offers: Token-based access using RPC approach
-- ============================================================

-- 1. Drop the current policies that are too permissive
DROP POLICY IF EXISTS "Public can view offers by token" ON public.job_offers;
DROP POLICY IF EXISTS "Public can respond to offers" ON public.job_offers;

-- 2. Create a security definer function to fetch offer by token (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_offer_by_token(_token text)
RETURNS SETOF public.job_offers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.job_offers WHERE token = _token LIMIT 1;
$$;

-- 3. Create a security definer function to respond to offer by token
CREATE OR REPLACE FUNCTION public.respond_to_offer(
  _token text,
  _status text,
  _response_notes text DEFAULT NULL,
  _signature_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offer RECORD;
BEGIN
  -- Validate status
  IF _status NOT IN ('viewed', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', _status;
  END IF;

  -- Find the offer by token
  SELECT * INTO _offer FROM public.job_offers WHERE token = _token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Only allow responding to sent or viewed offers
  IF _offer.status NOT IN ('sent', 'viewed') THEN
    RAISE EXCEPTION 'Offer cannot be modified in current status: %', _offer.status;
  END IF;

  -- Update the offer
  UPDATE public.job_offers
  SET 
    status = _status,
    response_notes = COALESCE(_response_notes, response_notes),
    signature_url = COALESCE(_signature_url, signature_url),
    response_date = CASE WHEN _status IN ('accepted', 'rejected') THEN now() ELSE response_date END,
    updated_at = now()
  WHERE token = _token;

  RETURN true;
END;
$$;

-- 4. Owner-only SELECT policy (owners see their own offers)
-- The "Users can manage own offers" ALL policy already covers this

-- 5. Grant execute to anon and authenticated for the RPC functions
GRANT EXECUTE ON FUNCTION public.get_offer_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(text, text, text, text) TO anon, authenticated;


-- =========================================================================
-- MIGRATION: 20260327134827_e7db138f-a725-4414-ad8e-bc6608eb847f.sql
-- =========================================================================


-- Fix 1: Restrict invitations admin policy to authenticated only
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add anon deny policy on login_otp_challenges
CREATE POLICY "No anon access to otp challenges"
ON public.login_otp_challenges
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Fix 3: Remove anon insert on audit_log (keep authenticated only)
DROP POLICY IF EXISTS "Anon can insert audit log" ON public.audit_log;


-- =========================================================================
-- MIGRATION: 20260327135034_07cb7168-2fa8-4385-adff-21b8df551010.sql
-- =========================================================================


-- ============================================================
-- Trigger: Auto-fill audit_log fields (user_email from auth)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_log_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-fill user_id from auth context if not set
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Always override user_email from JWT to prevent spoofing
  NEW.user_email := COALESCE(
    (auth.jwt() ->> 'email')::text,
    NEW.user_email
  );

  -- ip_address cannot be reliably obtained server-side in Supabase,
  -- so we keep client-provided value but mark it as unverified if empty
  IF NEW.ip_address IS NULL OR NEW.ip_address = '' THEN
    NEW.ip_address := 'unknown';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_log_auto_fill
BEFORE INSERT ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.audit_log_auto_fill();

-- ============================================================
-- Trigger: Auto-fill activity_log fields (user_name from profile)
-- ============================================================
CREATE OR REPLACE FUNCTION public.activity_log_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile RECORD;
BEGIN
  -- Auto-fill user_id from auth context if not set
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Always override user_name from profiles table to prevent spoofing
  SELECT full_name INTO _profile
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF FOUND AND _profile.full_name IS NOT NULL THEN
    NEW.user_name := _profile.full_name;
  ELSE
    -- Fallback to email from JWT
    NEW.user_name := COALESCE(
      (auth.jwt() ->> 'email')::text,
      NEW.user_name,
      'مستخدم غير معروف'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_log_auto_fill
BEFORE INSERT ON public.activity_log
FOR EACH ROW
EXECUTE FUNCTION public.activity_log_auto_fill();


-- =========================================================================
-- MIGRATION: 20260329202420_b24c1762-b891-4825-a91f-94582145c10d.sql
-- =========================================================================

-- Add company branding columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo text DEFAULT '';

-- =========================================================================
-- MIGRATION: 20260401151749_3ea2acef-3f51-4af0-9a99-b6c815837573.sql
-- =========================================================================


-- Create pipeline_stages table
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'circle',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own stages"
ON public.pipeline_stages
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Function to seed default stages for new company users
CREATE OR REPLACE FUNCTION public.seed_default_pipeline_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type text;
BEGIN
  _account_type := NEW.raw_user_meta_data->>'account_type';
  
  IF _account_type IS DISTINCT FROM 'job_seeker' THEN
    INSERT INTO public.pipeline_stages (user_id, name, sort_order, color, icon, is_default) VALUES
      (NEW.id, 'تقديم الطلب', 0, '#6366f1', 'file-text', true),
      (NEW.id, 'مراجعة السيرة', 1, '#8b5cf6', 'file-search', true),
      (NEW.id, 'فحص هاتفي', 2, '#0ea5e9', 'phone', true),
      (NEW.id, 'مقابلة تقنية', 3, '#f59e0b', 'code', true),
      (NEW.id, 'مقابلة نهائية', 4, '#10b981', 'users', true),
      (NEW.id, 'العرض الوظيفي', 5, '#059669', 'briefcase', true);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users on insert
CREATE TRIGGER on_auth_user_created_seed_stages
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_pipeline_stages();


-- =========================================================================
-- MIGRATION: 20260401154047_57e8cee0-594c-47bb-9317-0a63618930b8.sql
-- =========================================================================


CREATE OR REPLACE FUNCTION public.handle_new_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
  _default_stage text;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = NEW.job_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get the default stage name for this user, fallback to 'تقديم الطلب'
  SELECT name INTO _default_stage
  FROM public.pipeline_stages
  WHERE user_id = _job.user_id AND is_default = true AND is_active = true
  ORDER BY sort_order ASC
  LIMIT 1;

  IF _default_stage IS NULL THEN
    _default_stage := 'تقديم الطلب';
  END IF;

  INSERT INTO public.candidates (
    user_id, name, email, phone, role, experience, 
    summary, stage, status, source, job_id, resume_url,
    company_id, agency_id
  ) VALUES (
    _job.user_id,
    NEW.name,
    NEW.email,
    NEW.phone,
    _job.title,
    NEW.experience,
    NEW.cover_letter,
    _default_stage,
    'قيد المراجعة',
    'نموذج التقديم',
    _job.id,
    NEW.resume_url,
    _job.company_id,
    _job.agency_id
  );

  -- Copy company_id to the application row itself (since trigger is AFTER INSERT)
  UPDATE public.applications
  SET company_id = _job.company_id
  WHERE id = NEW.id;

  INSERT INTO public.notifications (user_id, title, description, type)
  VALUES (
    _job.user_id,
    'طلب توظيف جديد: ' || NEW.name,
    'تقدم ' || NEW.name || ' لوظيفة ' || _job.title,
    'application'
  );

  RETURN NEW;
END;
$function$;


-- =========================================================================
-- MIGRATION: 20260401154915_fb642ffd-8f63-46f3-842a-d89bb9f6ca94.sql
-- =========================================================================


-- Add transition_rules to pipeline_stages
ALTER TABLE public.pipeline_stages
ADD COLUMN IF NOT EXISTS transition_rules jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create sub-stages table
CREATE TABLE public.pipeline_sub_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_sub_stages ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage own sub-stages"
ON public.pipeline_sub_stages
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_sub_stages_stage_id ON public.pipeline_sub_stages(stage_id);
CREATE INDEX idx_sub_stages_user_id ON public.pipeline_sub_stages(user_id);


-- =========================================================================
-- MIGRATION: 20260401191725_cef833b3-b4dc-4e05-b4a8-838007452f6c.sql
-- =========================================================================


-- Create stage transitions history table
CREATE TABLE public.stage_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  moved_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stage_transitions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own stage transitions"
ON public.stage_transitions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stage transitions"
ON public.stage_transitions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_stage_transitions_candidate ON public.stage_transitions(candidate_id);
CREATE INDEX idx_stage_transitions_user ON public.stage_transitions(user_id);
CREATE INDEX idx_stage_transitions_created ON public.stage_transitions(created_at DESC);

-- Add automation_rules to pipeline_stages
ALTER TABLE public.pipeline_stages
ADD COLUMN IF NOT EXISTS automation_rules jsonb NOT NULL DEFAULT '{}'::jsonb;


-- =========================================================================
-- MIGRATION: 20260405022829_2a5b9872-6983-4c9c-a6ae-e30bb89d34a8.sql
-- =========================================================================


-- Question types enum
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'open_ended', 'code', 'true_false');

-- Difficulty levels enum  
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Question Bank table
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type public.question_type NOT NULL DEFAULT 'multiple_choice',
  difficulty public.difficulty_level NOT NULL DEFAULT 'medium',
  category TEXT DEFAULT '',
  correct_answer TEXT,
  explanation TEXT,
  code_language TEXT,
  time_limit_seconds INTEGER,
  points INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Question Options (for multiple choice)
CREATE TABLE public.question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessments (tests)
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  passing_score INTEGER DEFAULT 70,
  is_randomized BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  token TEXT NOT NULL DEFAULT upper(substr(md5(random()::text || gen_random_uuid()::text), 1, 12)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assessment Questions (link questions to assessments)
CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  points_override INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, question_id)
);

-- Assessment Responses (candidate answers)
CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: question_bank
CREATE POLICY "Users manage own questions" ON public.question_bank
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies: question_options
CREATE POLICY "Users manage own question options" ON public.question_options
  FOR ALL USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_id AND q.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_id AND q.user_id = auth.uid()));

CREATE POLICY "Anyone can view options for assessment" ON public.question_options
  FOR SELECT USING (true);

-- RLS Policies: assessments
CREATE POLICY "Users manage own assessments" ON public.assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active assessments by token" ON public.assessments
  FOR SELECT USING (is_active = true);

-- RLS Policies: assessment_questions
CREATE POLICY "Users manage own assessment questions" ON public.assessment_questions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE POLICY "Anyone can view assessment questions for active assessments" ON public.assessment_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.is_active = true));

-- RLS Policies: assessment_responses
CREATE POLICY "Users view responses for own assessments" ON public.assessment_responses
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE POLICY "Anyone can submit assessment responses" ON public.assessment_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Candidates can update own in-progress responses" ON public.assessment_responses
  FOR UPDATE USING (status = 'in_progress');

-- Indexes
CREATE INDEX idx_question_bank_user ON public.question_bank(user_id);
CREATE INDEX idx_question_bank_job ON public.question_bank(job_id);
CREATE INDEX idx_question_bank_type ON public.question_bank(question_type);
CREATE INDEX idx_assessments_user ON public.assessments(user_id);
CREATE INDEX idx_assessments_token ON public.assessments(token);
CREATE INDEX idx_assessment_responses_assessment ON public.assessment_responses(assessment_id);

-- Triggers for updated_at
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- =========================================================================
-- MIGRATION: 20260405022841_f2a2360d-e246-46d8-84f0-af7384dfade3.sql
-- =========================================================================


DROP POLICY "Anyone can submit assessment responses" ON public.assessment_responses;
CREATE POLICY "Anyone can submit responses to active assessments" ON public.assessment_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.is_active = true)
  );


-- =========================================================================
-- MIGRATION: 20260405024215_39f198f9-06f9-4777-8e90-33a032990702.sql
-- =========================================================================


ALTER TABLE public.pipeline_stages
ADD COLUMN assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL DEFAULT NULL;


-- =========================================================================
-- MIGRATION: 20260406015040_a2ad02d3-7f94-4afc-9cd3-ca4edcf90e69.sql
-- =========================================================================

CREATE TABLE public.email_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  candidate_email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  tracking_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  opened_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email tracking"
  ON public.email_tracking FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own email tracking"
  ON public.email_tracking FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_email_tracking_tracking_id ON public.email_tracking(tracking_id);
CREATE INDEX idx_email_tracking_candidate ON public.email_tracking(candidate_id);
CREATE INDEX idx_email_tracking_user ON public.email_tracking(user_id);

-- =========================================================================
-- MIGRATION: 20260406015109_08b3aea6-3195-413c-bce1-3bc27326b1f5.sql
-- =========================================================================

-- Function to increment open count (called by tracking pixel endpoint)
CREATE OR REPLACE FUNCTION public.increment_email_open_count(_tracking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_tracking
  SET 
    opened_count = opened_count + 1,
    opened_at = COALESCE(opened_at, now())
  WHERE tracking_id = _tracking_id;
END;
$$;

-- Allow anon to call this function (tracking pixel has no auth)
GRANT EXECUTE ON FUNCTION public.increment_email_open_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_email_open_count(UUID) TO authenticated;

-- =========================================================================
-- MIGRATION: 20260415093751_db5ba464-f10d-46b2-8a74-961557e8b50d.sql
-- =========================================================================


CREATE TABLE public.roadmap_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  UNIQUE(user_id, task_key)
);

ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roadmap tasks"
  ON public.roadmap_tasks
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- =========================================================================
-- MIGRATION: 20260415114655_9f2da578-82a2-4b7a-aa70-86e1adf39726.sql
-- =========================================================================


-- Add new columns to pipeline_sub_stages
ALTER TABLE public.pipeline_sub_stages
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assignee_type text DEFAULT 'recruiter';


-- =========================================================================
-- MIGRATION: 20260415151810_73ee12d3-3d53-4daf-ad00-7b65745afa1d.sql
-- =========================================================================


-- Email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_default BOOLEAN DEFAULT false,
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Scheduled emails table
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled emails"
  ON public.scheduled_emails FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =========================================================================
-- MIGRATION: 20260415152526_0387fdec-46a9-41d2-a31f-f7591bdc9610.sql
-- =========================================================================


-- Add new question types
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'ordering';

-- Add anti-cheat tracking columns to assessment_responses
ALTER TABLE public.assessment_responses 
  ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tab_switch_log JSONB DEFAULT '[]'::jsonb;


-- =========================================================================
-- MIGRATION: 20260416082221_59225232-b984-453d-81f6-eb151177e90e.sql
-- =========================================================================

ALTER TABLE public.pipeline_stages 
ADD COLUMN assigned_user_ids uuid[] DEFAULT '{}'::uuid[];

-- =========================================================================
-- MIGRATION: 20260417141303_89448e43-4d09-4a1e-a5af-29b57685645f.sql
-- =========================================================================

-- Blog Posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  excerpt_ar TEXT,
  excerpt_en TEXT,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  cover_image TEXT,
  category TEXT DEFAULT 'general',
  author_name TEXT NOT NULL DEFAULT 'فريق Tawzeef-X',
  author_avatar TEXT,
  read_time_minutes INTEGER DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view published posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto update updated_at
CREATE TRIGGER blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Seed initial posts
INSERT INTO public.blog_posts (slug, title_ar, title_en, excerpt_ar, excerpt_en, content_ar, content_en, category, read_time_minutes, published, published_at) VALUES
(
  'ai-revolutionizing-recruitment',
  'كيف يُحدث الذكاء الاصطناعي ثورة في عالم التوظيف',
  'How AI Is Revolutionizing the World of Recruitment',
  'اكتشف كيف يغير الذكاء الاصطناعي طريقة عمل فرق الموارد البشرية ويوفر 80% من الوقت في فلترة المرشحين.',
  'Discover how AI is transforming HR teams and saving 80% of time in candidate screening.',
  E'# الذكاء الاصطناعي في التوظيف\n\nشهد مجال التوظيف تحولاً جذرياً مع دخول تقنيات الذكاء الاصطناعي. اليوم، يمكن للشركات معالجة آلاف السير الذاتية في دقائق معدودة بدلاً من أسابيع.\n\n## أبرز الفوائد\n\n- **توفير الوقت**: تحليل تلقائي للسير الذاتية\n- **دقة عالية**: تقييم موضوعي للمهارات\n- **تجربة مرشح أفضل**: ردود فورية وتواصل سريع\n\n## كيف نطبق هذا في Tawzeef-X؟\n\nنستخدم نماذج لغوية متقدمة لتحليل المرشحين وتقييم تطابقهم مع الوظائف بدقة تصل إلى 92%.',
  E'# AI in Recruitment\n\nThe recruitment field has witnessed a radical transformation with AI technologies. Today, companies can process thousands of resumes in minutes instead of weeks.\n\n## Key Benefits\n\n- **Time Saving**: Automatic resume analysis\n- **High Accuracy**: Objective skills assessment\n- **Better Candidate Experience**: Instant responses\n\n## How We Apply This at Tawzeef-X?\n\nWe use advanced language models to analyze candidates and assess their match with jobs at 92% accuracy.',
  'ai',
  6,
  true,
  now() - interval '5 days'
),
(
  'remote-hiring-best-practices',
  'أفضل ممارسات التوظيف عن بُعد في 2026',
  'Best Remote Hiring Practices in 2026',
  'دليل شامل لإدارة فرق التوظيف عن بُعد بفعالية مع استخدام أحدث الأدوات الرقمية.',
  'A comprehensive guide to managing remote hiring teams with the latest digital tools.',
  E'# التوظيف عن بُعد\n\nأصبح التوظيف عن بُعد المعيار الجديد للشركات الحديثة. إليك أفضل الممارسات:\n\n## 1. المقابلات المرئية المنظمة\n\nاستخدم منصات احترافية مع تسجيل ونسخ نصي تلقائي.\n\n## 2. اختبارات تقنية موحدة\n\nقم بإنشاء بنك أسئلة شامل لكل وظيفة.\n\n## 3. تجربة مرشح متميزة\n\nتواصل سريع، شفافية، وردود فعل واضحة في كل مرحلة.',
  E'# Remote Hiring\n\nRemote hiring has become the new standard for modern companies. Here are the best practices:\n\n## 1. Structured Video Interviews\n\nUse professional platforms with recording and auto-transcription.\n\n## 2. Standardized Technical Tests\n\nBuild a comprehensive question bank for each role.\n\n## 3. Excellent Candidate Experience\n\nFast communication, transparency, and clear feedback at every stage.',
  'hr',
  8,
  true,
  now() - interval '12 days'
),
(
  'employer-branding-guide',
  'بناء العلامة التجارية للموظف: دليل مفصّل',
  'Employer Branding: A Detailed Guide',
  'كيف تبني علامة تجارية قوية تجذب أفضل المواهب وتحتفظ بها على المدى الطويل.',
  'How to build a strong brand that attracts and retains top talent long-term.',
  E'# العلامة التجارية للموظف\n\nالعلامة التجارية للموظف هي ما يجعل شركتك مميزة في عيون المرشحين. إنها أكثر من مجرد شعار أو موقع جذاب.\n\n## العناصر الأساسية\n\n- **الثقافة المؤسسية**: قيم واضحة وبيئة عمل صحية\n- **التطور المهني**: فرص نمو وتدريب مستمر\n- **التعويضات والمزايا**: حزمة تنافسية وعادلة\n\n## قياس النجاح\n\nتابع معدل القبول، رضا الموظفين، ومراجعات Glassdoor.',
  E'# Employer Branding\n\nEmployer branding is what makes your company stand out to candidates. It is more than a logo or attractive website.\n\n## Core Elements\n\n- **Company Culture**: Clear values and healthy work environment\n- **Career Growth**: Continuous development opportunities\n- **Compensation**: Competitive and fair packages\n\n## Measuring Success\n\nTrack offer acceptance rate, employee satisfaction, and Glassdoor reviews.',
  'branding',
  7,
  true,
  now() - interval '20 days'
);

-- =========================================================================
-- MIGRATION: 20260422085234_54fa8394-139b-4a00-b886-99cf46f451a7.sql
-- =========================================================================

-- 1. Search History Table
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  result_count INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_user_created ON public.search_history(user_id, created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own search history"
ON public.search_history FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Saved Filters Table
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'candidates',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_filters_user ON public.saved_filters(user_id, scope);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved filters"
ON public.saved_filters FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_saved_filters_updated_at
BEFORE UPDATE ON public.saved_filters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Add QR code URL column to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- =========================================================================
-- MIGRATION: 20260422103841_f4936c81-d377-4b46-96fa-a7c2ea5399d9.sql
-- =========================================================================


-- Add embedding cache column to candidates (jsonb array of floats)
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS embedding jsonb;

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS embedding_text text;

CREATE INDEX IF NOT EXISTS idx_candidates_user_id_created ON public.candidates(user_id, created_at DESC);


-- =========================================================================
-- MIGRATION: 20260502022902_b1f7e9f3-7e9f-46ca-bb1a-133948a506dc.sql
-- =========================================================================

-- Resume archive notes & tags table
CREATE TABLE public.resume_archive_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_url text NOT NULL,
  candidate_email text,
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resume_url, candidate_email)
);

CREATE INDEX idx_resume_archive_meta_user ON public.resume_archive_meta(user_id);
CREATE INDEX idx_resume_archive_meta_tags ON public.resume_archive_meta USING GIN(tags);

ALTER TABLE public.resume_archive_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own archive meta"
ON public.resume_archive_meta FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_resume_archive_meta_updated_at
BEFORE UPDATE ON public.resume_archive_meta
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for live archive updates
ALTER TABLE public.candidates REPLICA IDENTITY FULL;
ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER TABLE public.resume_archive_meta REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.resume_archive_meta;

-- =========================================================================
-- MIGRATION: 20260504111114_79783143-f87c-43ef-a25c-46175df0ffc1.sql
-- =========================================================================


-- ============================================================
-- 1) RESUMES BUCKET: make private + tighten policies
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'resumes';

-- Drop all existing policies on storage.objects for resumes bucket
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%resumes%' OR with_check LIKE '%resumes%' OR policyname ILIKE '%resume%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Authenticated users can upload to resumes (10MB, restricted mime types enforced client-side; bucket ACL just needs auth)
CREATE POLICY "Authenticated users can upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

-- Owners (recruiters) can read resumes attached to candidates/applications under their jobs
CREATE POLICY "Job owners can read their resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.user_id = auth.uid()
        AND c.resume_url LIKE '%' || storage.objects.name || '%'
    )
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE j.user_id = auth.uid()
        AND a.resume_url LIKE '%' || storage.objects.name || '%'
    )
  )
);

-- Job seekers can read their own resume files
CREATE POLICY "Candidates can read own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.email = (auth.jwt() ->> 'email')
        AND c.resume_url LIKE '%' || storage.objects.name || '%'
    )
  )
);

-- Owners can delete resumes they own
CREATE POLICY "Job owners can delete their resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.user_id = auth.uid()
        AND c.resume_url LIKE '%' || storage.objects.name || '%'
    )
  )
);

-- ============================================================
-- 2) QUESTION_OPTIONS: lock down public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view options for assessment" ON public.question_options;

-- Owner-only SELECT policy already exists ("Users manage own question options"), keep it.

-- ============================================================
-- 3) Safe RPC for candidate-side question fetching (no is_correct)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_assessment_for_candidate(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assessment RECORD;
  _questions jsonb;
BEGIN
  SELECT id, title, description, duration_minutes, passing_score, is_randomized, is_active
  INTO _assessment
  FROM public.assessments
  WHERE token = _token AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  SELECT COALESCE(jsonb_agg(qq ORDER BY qq->>'sort_order'), '[]'::jsonb)
  INTO _questions
  FROM (
    SELECT jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'question_type', q.question_type,
      'code_language', q.code_language,
      'points', q.points,
      'sort_order', aq.sort_order,
      'options', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', o.id,
          'option_text', o.option_text,
          'sort_order', o.sort_order
        ) ORDER BY o.sort_order)
        FROM public.question_options o
        WHERE o.question_id = q.id
      ), '[]'::jsonb)
    ) AS qq
    FROM public.assessment_questions aq
    JOIN public.question_bank q ON q.id = aq.question_id
    WHERE aq.assessment_id = _assessment.id
    ORDER BY aq.sort_order
  ) sub;

  RETURN jsonb_build_object(
    'assessment', to_jsonb(_assessment),
    'questions', _questions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assessment_for_candidate(text) TO anon, authenticated;

-- ============================================================
-- 4) Safe RPC to start an assessment response
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_assessment_response(_token text, _name text, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assessment_id uuid;
  _response_id uuid;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 OR length(_name) > 200 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 320 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT id INTO _assessment_id
  FROM public.assessments
  WHERE token = _token AND is_active = true
  LIMIT 1;

  IF _assessment_id IS NULL THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;

  INSERT INTO public.assessment_responses (assessment_id, candidate_name, candidate_email, answers, status)
  VALUES (_assessment_id, trim(_name), lower(trim(_email)), '[]'::jsonb, 'in_progress')
  RETURNING id INTO _response_id;

  RETURN _response_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_assessment_response(text, text, text) TO anon, authenticated;

-- ============================================================
-- 5) Safe RPC to submit (score) an assessment response server-side
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_assessment_response(
  _response_id uuid,
  _answers jsonb,
  _tab_switches integer DEFAULT 0,
  _tab_switch_log jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _response RECORD;
  _assessment RECORD;
  _question RECORD;
  _ans jsonb;
  _user_answer text;
  _is_correct boolean;
  _points_earned integer;
  _total_score integer := 0;
  _max_score integer := 0;
  _percentage numeric;
  _answers_out jsonb := '[]'::jsonb;
  _open_answers jsonb := '[]'::jsonb;
  _correct_opt_id uuid;
  _correct_answer text;
BEGIN
  SELECT * INTO _response FROM public.assessment_responses WHERE id = _response_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Response not found'; END IF;
  IF _response.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Response already submitted';
  END IF;

  SELECT * INTO _assessment FROM public.assessments WHERE id = _response.assessment_id;

  -- Iterate over assessment questions in defined order
  FOR _question IN
    SELECT q.id, q.question_text, q.question_type, q.code_language, q.correct_answer, q.points,
           COALESCE(aq.points_override, q.points) AS effective_points,
           aq.sort_order
    FROM public.assessment_questions aq
    JOIN public.question_bank q ON q.id = aq.question_id
    WHERE aq.assessment_id = _assessment.id
    ORDER BY aq.sort_order
  LOOP
    _max_score := _max_score + _question.effective_points;

    -- Find user's answer for this question
    SELECT a INTO _ans
    FROM jsonb_array_elements(_answers) a
    WHERE (a->>'question_id') = _question.id::text
    LIMIT 1;

    _user_answer := COALESCE(_ans->>'answer', '');
    _is_correct := false;
    _points_earned := 0;

    IF _question.question_type = 'multiple_choice' THEN
      SELECT id INTO _correct_opt_id FROM public.question_options
      WHERE question_id = _question.id AND is_correct = true LIMIT 1;
      IF _correct_opt_id::text = _user_answer THEN
        _is_correct := true;
        _points_earned := _question.effective_points;
        _total_score := _total_score + _points_earned;
      END IF;
    ELSIF _question.question_type = 'true_false' THEN
      IF _question.correct_answer = _user_answer THEN
        _is_correct := true;
        _points_earned := _question.effective_points;
        _total_score := _total_score + _points_earned;
      END IF;
    ELSIF _question.question_type IN ('open_ended', 'code') THEN
      -- Defer to AI; just record the answer
      _open_answers := _open_answers || jsonb_build_object(
        'question_id', _question.id,
        'question_text', _question.question_text,
        'question_type', _question.question_type,
        'answer', _user_answer,
        'correct_answer', _question.correct_answer,
        'code_language', _question.code_language,
        'points', _question.effective_points
      );
    END IF;

    _answers_out := _answers_out || jsonb_build_object(
      'question_id', _question.id,
      'answer', _user_answer,
      'is_correct', _is_correct,
      'points_earned', _points_earned,
      'ai_evaluated', _question.question_type IN ('open_ended','code')
    );
  END LOOP;

  _percentage := CASE WHEN _max_score > 0 THEN round((_total_score::numeric / _max_score) * 100) ELSE 0 END;

  UPDATE public.assessment_responses
  SET answers = _answers_out,
      total_score = _total_score,
      max_score = _max_score,
      percentage = _percentage,
      status = 'completed',
      completed_at = now(),
      tab_switches = COALESCE(_tab_switches, 0),
      tab_switch_log = COALESCE(_tab_switch_log, '[]'::jsonb)
  WHERE id = _response_id;

  RETURN jsonb_build_object(
    'response_id', _response_id,
    'total_score', _total_score,
    'max_score', _max_score,
    'percentage', _percentage,
    'open_answers', _open_answers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_assessment_response(uuid, jsonb, integer, jsonb) TO anon, authenticated;

-- ============================================================
-- 6) Tighten assessment_responses UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "Candidates can update own in-progress responses" ON public.assessment_responses;
-- Owner UPDATE/SELECT/DELETE remain via "Users view responses for own assessments" + ALL via assessment ownership
-- (Adds owner update policy to ensure recruiters can update)
CREATE POLICY "Owners can update assessment responses"
ON public.assessment_responses FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_responses.assessment_id AND a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_responses.assessment_id AND a.user_id = auth.uid()));

-- Allow patching AI-evaluated open answers via SECURITY DEFINER (already covered by submit_assessment_response)

-- ============================================================
-- 7) RPC to apply AI evaluations after submission
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_ai_evaluations(_response_id uuid, _evaluations jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resp RECORD;
  _ans jsonb;
  _new_answers jsonb := '[]'::jsonb;
  _ev jsonb;
  _q_id text;
  _added integer;
  _total integer := 0;
  _percentage numeric;
BEGIN
  SELECT * INTO _resp FROM public.assessment_responses WHERE id = _response_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;

  FOR _ans IN SELECT value FROM jsonb_array_elements(_resp.answers)
  LOOP
    _q_id := _ans->>'question_id';
    SELECT value INTO _ev FROM jsonb_array_elements(_evaluations)
      WHERE (value->>'question_id') = _q_id LIMIT 1;
    IF _ev IS NOT NULL THEN
      _added := COALESCE((_ev->>'score')::int, 0);
      _ans := _ans || jsonb_build_object(
        'points_earned', _added,
        'ai_feedback', _ev->>'feedback',
        'ai_strengths', _ev->'strengths',
        'ai_improvements', _ev->'improvements'
      );
    END IF;
    _total := _total + COALESCE((_ans->>'points_earned')::int, 0);
    _new_answers := _new_answers || _ans;
  END LOOP;

  _percentage := CASE WHEN _resp.max_score > 0 THEN round((_total::numeric / _resp.max_score) * 100) ELSE 0 END;

  UPDATE public.assessment_responses
  SET answers = _new_answers,
      total_score = _total,
      percentage = _percentage
  WHERE id = _response_id;

  RETURN jsonb_build_object('total_score', _total, 'percentage', _percentage);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_ai_evaluations(uuid, jsonb) TO anon, authenticated;


-- =========================================================================
-- MIGRATION: 20260504111357_094da6bc-517f-42cf-a941-052af10abcc3.sql
-- =========================================================================


-- Replace the auth-only insert policy so anonymous applicants can still upload via public job apply forms
DROP POLICY IF EXISTS "Authenticated users can upload resumes" ON storage.objects;

CREATE POLICY "Anyone can upload to resumes bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'resumes');


-- =========================================================================
-- MIGRATION: 20260504111703_c4dbadb4-91e7-41c5-9c35-fd5c0b8d30e8.sql
-- =========================================================================


-- 1. Restrict question_options public read - only owners can read directly
DROP POLICY IF EXISTS "Users manage own question options" ON public.question_options;

CREATE POLICY "Owners select question options"
ON public.question_options FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

CREATE POLICY "Owners insert question options"
ON public.question_options FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

CREATE POLICY "Owners update question options"
ON public.question_options FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

CREATE POLICY "Owners delete question options"
ON public.question_options FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

-- Also restrict assessment_questions public read (used to be open)
DROP POLICY IF EXISTS "Anyone can view assessment questions for active assessments" ON public.assessment_questions;
-- Candidates use SECURITY DEFINER RPC get_assessment_for_candidate(_token); no public policy needed.

-- 2. Block public direct INSERT into assessment_responses (must use start_assessment_response RPC)
DROP POLICY IF EXISTS "Anyone can submit responses to active assessments" ON public.assessment_responses;
-- start_assessment_response and submit_assessment_response are SECURITY DEFINER, so they bypass RLS.

-- 3. Restrict resumes bucket uploads: allow anon but only to 'applications/' folder, files <= reasonable extensions, and 1 file per request
DROP POLICY IF EXISTS "Anyone can upload to resumes bucket" ON storage.objects;

CREATE POLICY "Public can upload application resumes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = 'applications'
  AND lower(right(name, 4)) IN ('.pdf', '.doc', 'docx')
);

CREATE POLICY "Authenticated users upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'applications')
);

-- 4. roadmap_tasks: add user-scoped policy
CREATE POLICY "Users manage own roadmap tasks"
ON public.roadmap_tasks FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Invitations: secure token lookup RPC
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
BEGIN
  SELECT id, email, role, status, expires_at INTO _inv
  FROM public.invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now()
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  RETURN jsonb_build_object(
    'found', true,
    'id', _inv.id,
    'email', _inv.email,
    'role', _inv.role,
    'expires_at', _inv.expires_at
  );
END;
$$;


-- =========================================================================
-- MIGRATION: 20260512170456_b54166d9-afe7-479f-8de7-10dd818d6641.sql
-- =========================================================================


-- 1) Storage listing: restrict avatars SELECT (listing) to authenticated.
-- Public file URLs still work because the bucket is public.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Authenticated users can list avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- 2) Lock down SECURITY DEFINER functions: revoke from PUBLIC + anon + authenticated,
--    then grant back only to the public-flow RPCs.

-- Revoke broad EXECUTE on every public SECURITY DEFINER function we manage.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant ONLY the public-facing RPCs the app needs
GRANT EXECUTE ON FUNCTION public.get_offer_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_for_candidate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_assessment_response(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment_response(uuid, jsonb, integer, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- has_role / get_user_role used inside RLS policies — RLS evaluates as the policy owner,
-- so explicit GRANT to clients is not required. Leave revoked.


-- =========================================================================
-- MIGRATION: 20260512170514_b31f0636-ec47-4302-8f1c-9b2cc9c963d4.sql
-- =========================================================================

DROP POLICY IF EXISTS "Authenticated users can list avatars" ON storage.objects;

-- =========================================================================
-- MIGRATION: 20260512171124_54c7484a-823d-4357-ad89-ab7639c8797d.sql
-- =========================================================================


-- 1) Remove public SELECT on assessments. The candidate-facing
--    get_assessment_for_candidate RPC (SECURITY DEFINER) already returns
--    only the safe columns, and submit_assessment_response reads internally.
DROP POLICY IF EXISTS "Anyone can view active assessments by token" ON public.assessments;

-- 2) Fix anon resume-upload extension check (".docx" needed leading dot)
DROP POLICY IF EXISTS "Public can upload application resumes" ON storage.objects;
CREATE POLICY "Public can upload application resumes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = 'applications'
  AND (
    lower(right(name, 4)) IN ('.pdf', '.doc')
    OR lower(right(name, 5)) = '.docx'
  )
);


-- =========================================================================
-- MIGRATION: 20260512230255_545059a6-3a45-49f0-875a-1ca4242d43a3.sql
-- =========================================================================

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- =========================================================================
-- MIGRATION: 20260514133944_30a4cb88-0c9b-47ed-88df-7ab383c5ef14.sql
-- =========================================================================


-- ============================================================
-- 1. ENUM EXTENSIONS
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_hr';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agency_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agency_officer';


-- =========================================================================
-- MIGRATION: 20260514134113_40227222-1510-4c0e-91ff-1115b09d3a86.sql
-- =========================================================================


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


-- =========================================================================
-- MIGRATION: 20260517130423_7ea5bc5a-f0e0-4e69-9c96-b188ae287926.sql
-- =========================================================================

INSERT INTO public.checklist_templates (key, name_ar, name_en, description, items, is_default, is_active)
VALUES (
  'ksa_full_recruitment',
  'مسار التوظيف السعودي الكامل',
  'KSA Full Recruitment Flow',
  'مسار شامل من تحديد الاحتياج حتى التعاقد عبر منصة قوى',
  '[
    {"title":"تحديد الاحتياج الوظيفي","description":"وحدة التخطيط — المخرج: إعلان وظيفي مُولَّد تلقائياً","assigned_to_type":"owner"},
    {"title":"تسجيل المتقدمين","description":"الأفراد / الوكالات — المخرج: بروفايل + كود للمتقدم","assigned_to_type":"recruiter"},
    {"title":"الفرز الأولي بالذكاء الاصطناعي","description":"AI + السيرة الذاتية — المخرج: قائمة المؤهلين مبدئياً","assigned_to_type":"recruiter"},
    {"title":"الاختبار التحريري","description":"بنك الأسئلة + المتقدم — المخرج: نتيجة + تحليل AI","assigned_to_type":"recruiter"},
    {"title":"المقابلة الفنية","description":"المشرفون التعليميون — المخرج: نقاط التقييم + توصية","assigned_to_type":"hr"},
    {"title":"مقابلة الاعتماد الإداري","description":"اللجنة الإدارية + AI — المخرج: قرار القبول / الاستبعاد","assigned_to_type":"owner"},
    {"title":"عرض الوظيفة","description":"إدارة الرواتب والمزايا — المخرج: قبول المرشح موثَّقاً","assigned_to_type":"hr"},
    {"title":"إجراءات الاستقدام (خارج المملكة)","description":"المكاتب الخارجية + المعاملات الحكومية — المخرج: تأشيرة سارية 100%","assigned_to_type":"agency"},
    {"title":"النقل إلى HR","description":"وحدة الموارد البشرية — المخرج: عقد عمل عبر منصة قوى","assigned_to_type":"hr"}
  ]'::jsonb,
  false,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  items = EXCLUDED.items,
  is_active = true;

-- =========================================================================
-- MIGRATION: 20260517131142_e8e02bb1-f1ec-4eb5-abbf-86e8b59147a0.sql
-- =========================================================================


-- Revoke EXECUTE from anon/authenticated/public on trigger-only SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'handle_new_application()',
    'handle_new_user()',
    'handle_new_user_role()',
    'handle_invitation_signup()',
    'seed_default_pipeline_stages()',
    'generate_tracking_code()',
    'dispatch_offer_webhook()',
    'dispatch_candidate_webhook()',
    'dispatch_job_webhook()',
    'dispatch_job_created_webhook()',
    'audit_log_auto_fill()',
    'activity_log_auto_fill()',
    'update_updated_at()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;


-- =========================================================================
-- MIGRATION: 20260604234838_0f87d985-30ff-4292-abc3-afdd90e9d2a5.sql
-- =========================================================================


-- ============ 1) UNIFY RLS: add company_id-based access alongside user_id ============

-- JOBS
DROP POLICY IF EXISTS "Company members access jobs" ON public.jobs;
CREATE POLICY "Company members access jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- CANDIDATES
DROP POLICY IF EXISTS "Company members access candidates" ON public.candidates;
CREATE POLICY "Company members access candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- APPLICATIONS
DROP POLICY IF EXISTS "Company members view applications" ON public.applications;
CREATE POLICY "Company members view applications" ON public.applications
  FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id));

DROP POLICY IF EXISTS "Company members update applications" ON public.applications;
CREATE POLICY "Company members update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- INTERVIEWS
DROP POLICY IF EXISTS "Company members access interviews" ON public.interviews;
CREATE POLICY "Company members access interviews" ON public.interviews
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- JOB_OFFERS
DROP POLICY IF EXISTS "Company members access offers" ON public.job_offers;
CREATE POLICY "Company members access offers" ON public.job_offers
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- ASSESSMENTS
DROP POLICY IF EXISTS "Company members access assessments" ON public.assessments;
CREATE POLICY "Company members access assessments" ON public.assessments
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_company_id ON public.candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_agency_id ON public.candidates(agency_id);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON public.applications(company_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company_id ON public.interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_company_id ON public.job_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_assessments_company_id ON public.assessments(company_id);

-- ============ 2) COMPANY INVITATIONS ============

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  email text NOT NULL,
  member_role text NOT NULL DEFAULT 'hr',
  invited_by uuid,
  token text NOT NULL UNIQUE DEFAULT UPPER(substr(md5(random()::text || gen_random_uuid()::text), 1, 16)),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invitations TO authenticated;
GRANT ALL ON public.company_invitations TO service_role;

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage company invitations" ON public.company_invitations;
CREATE POLICY "Admins manage company invitations" ON public.company_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company owners manage own invitations" ON public.company_invitations;
CREATE POLICY "Company owners manage own invitations" ON public.company_invitations
  FOR ALL TO authenticated
  USING (public.is_company_owner(company_id))
  WITH CHECK (public.is_company_owner(company_id));

DROP POLICY IF EXISTS "Invitees can view their invitation by email" ON public.company_invitations;
CREATE POLICY "Invitees can view their invitation by email" ON public.company_invitations
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON public.company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON public.company_invitations(token);

CREATE TRIGGER trg_company_invitations_updated_at
  BEFORE UPDATE ON public.company_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RPC: accept invitation
CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _user_email text;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  _user_email := (auth.jwt() ->> 'email');

  SELECT * INTO _inv FROM public.company_invitations
   WHERE token = _token LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND');
  END IF;

  IF _inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_PENDING', 'status', _inv.status);
  END IF;

  IF _inv.expires_at < now() THEN
    UPDATE public.company_invitations SET status = 'expired' WHERE id = _inv.id;
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EXPIRED');
  END IF;

  IF lower(_inv.email) <> lower(_user_email) THEN
    RETURN jsonb_build_object('success', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  -- Insert membership if not exists
  INSERT INTO public.company_members (company_id, user_id, member_role, invited_by)
  VALUES (_inv.company_id, _uid, _inv.member_role, _inv.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.company_invitations
     SET status = 'accepted', accepted_at = now()
   WHERE id = _inv.id;

  RETURN jsonb_build_object('success', true, 'company_id', _inv.company_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_company_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(text) TO authenticated;

-- RPC: decline invitation
CREATE OR REPLACE FUNCTION public.decline_company_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED');
  END IF;
  _user_email := (auth.jwt() ->> 'email');

  SELECT * INTO _inv FROM public.company_invitations WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND');
  END IF;
  IF _inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_PENDING');
  END IF;
  IF lower(_inv.email) <> lower(_user_email) THEN
    RETURN jsonb_build_object('success', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  UPDATE public.company_invitations
     SET status = 'declined', declined_at = now()
   WHERE id = _inv.id;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decline_company_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_company_invitation(text) TO authenticated;


-- =========================================================================
-- MIGRATION: 20260615050000_add_tasks_and_evaluations.sql
-- =========================================================================

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_en text,
  description text,
  description_en text,
  assignee text NOT NULL,
  assignee_en text,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  column_status text NOT NULL DEFAULT 'todo',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_status ON public.tasks(column_status);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- Performance Evaluations Table
CREATE TABLE IF NOT EXISTS public.performance_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evalee_name text NOT NULL,
  evalee_name_en text,
  evalee_role text NOT NULL,
  evalee_role_en text,
  reviewer_name text NOT NULL,
  reviewer_name_en text,
  relationship text NOT NULL,
  productivity numeric NOT NULL,
  leadership numeric NOT NULL,
  teamwork numeric NOT NULL,
  technical numeric NOT NULL,
  communication numeric NOT NULL,
  comment text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_evaluations TO authenticated;
GRANT ALL ON public.performance_evaluations TO service_role;

ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own evaluations" ON public.performance_evaluations;
CREATE POLICY "Users can manage their own evaluations" ON public.performance_evaluations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_perf_eval_user_id ON public.performance_evaluations(user_id);

DROP TRIGGER IF EXISTS trg_performance_evaluations_updated_at ON public.performance_evaluations;
CREATE TRIGGER trg_performance_evaluations_updated_at
  BEFORE UPDATE ON public.performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();



-- =========================================================================
-- CUSTOM TRIGGER: Auto-grant Admin role to ctraining801@gmail.com
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'ctraining801@gmail.com' THEN 'admin' ELSE 'recruiter' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =========================================================================
-- EMAIL ATTACHMENTS SUPPORT POLICIES
-- =========================================================================

-- Storage policies for email attachments in resumes bucket
-- Authenticated users can read their own files in the resumes bucket under their folder
DROP POLICY IF EXISTS "Users can read own folder files" ON storage.objects;
CREATE POLICY "Users can read own folder files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

-- Authenticated users can delete their own files in the resumes bucket under their folder
DROP POLICY IF EXISTS "Users can delete own folder files" ON storage.objects;
CREATE POLICY "Users can delete own folder files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

