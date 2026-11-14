-- Deliberately public contact data only. Login addresses and Auth credentials
-- remain in Auth and are never changed by editing this singleton.
CREATE TABLE public.platform_contact_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  contact_email text NOT NULL,
  support_email text NOT NULL,
  contact_phone text NOT NULL DEFAULT '',
  location_ar text NOT NULL DEFAULT '' CHECK (length(location_ar) <= 240),
  location_en text NOT NULL DEFAULT '' CHECK (length(location_en) <= 240),
  hours_ar text NOT NULL DEFAULT '' CHECK (length(hours_ar) <= 240),
  hours_en text NOT NULL DEFAULT '' CHECK (length(hours_en) <= 240),
  CONSTRAINT valid_contact_email CHECK (
    length(contact_email) <= 254 AND contact_email ~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT valid_support_email CHECK (
    length(support_email) <= 254 AND support_email ~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT valid_contact_phone CHECK (
    contact_phone = '' OR (length(contact_phone) <= 40 AND contact_phone ~ '^\+?[0-9][0-9 ()-]{4,39}$')
  )
);
ALTER TABLE public.platform_contact_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_contact_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_contact_settings TO anon, authenticated;
GRANT UPDATE (contact_email, support_email, contact_phone, location_ar, location_en, hours_ar, hours_en)
  ON public.platform_contact_settings TO authenticated;
CREATE POLICY "Public website contact details" ON public.platform_contact_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Platform super admin edits public contact details" ON public.platform_contact_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_super_admin_user()))
  WITH CHECK ((SELECT public.is_super_admin_user()));
INSERT INTO public.platform_contact_settings (contact_email, support_email)
VALUES ('tawzeefx@outlook.com', 'tawzeefx@outlook.com');
COMMENT ON TABLE public.platform_contact_settings IS
  'Public website contact details. Never store secrets, account emails, or private company data here.';
