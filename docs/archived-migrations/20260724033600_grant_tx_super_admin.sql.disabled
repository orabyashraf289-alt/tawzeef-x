-- Grant Super Admin & Full System Permissions to tx@tawzeefx.com
-- This script ensures tx@tawzeefx.com has master access across all companies and features.

DO $$
DECLARE
  v_user_id uuid;
  v_comp RECORD;
BEGIN
  -- Find user_id for tx@tawzeefx.com
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'tx@tawzeefx.com';

  IF v_user_id IS NOT NULL THEN
    -- 1. Upgrade auth.users metadata to super_admin
    UPDATE auth.users
    SET 
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"]}'::jsonb,
      raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin", "is_super_admin": true, "account_type": "company", "full_name": "Tawzeef-X Master Admin"}'::jsonb
    WHERE id = v_user_id;

    -- 2. Upsert public.profiles with admin role
    INSERT INTO public.profiles (id, email, full_name, role, updated_at)
    VALUES (v_user_id, 'tx@tawzeefx.com', 'Tawzeef-X Master Admin', 'admin', now())
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      updated_at = now();

    -- 3. Ensure user_roles table entry
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin')
      ON CONFLICT DO NOTHING;
    END IF;

    -- 4. Grant owner access to all companies in company_members
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_members') THEN
      FOR v_comp IN SELECT id FROM public.companies LOOP
        INSERT INTO public.company_members (company_id, user_id, role)
        VALUES (v_comp.id, v_user_id, 'owner')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    RAISE NOTICE 'Successfully granted Super Admin privileges to tx@tawzeefx.com';
  ELSE
    RAISE NOTICE 'tx@tawzeefx.com is not yet registered in auth.users.';
  END IF;
END $$;
