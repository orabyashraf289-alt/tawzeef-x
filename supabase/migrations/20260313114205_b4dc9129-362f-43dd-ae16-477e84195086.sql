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