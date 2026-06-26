
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
