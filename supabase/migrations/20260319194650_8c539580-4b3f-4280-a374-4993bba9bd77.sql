
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
