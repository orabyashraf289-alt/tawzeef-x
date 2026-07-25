-- Create RPC Function to safely register agency accounts with exact typed passwords
CREATE OR REPLACE FUNCTION public.create_agency_account(
  p_email text,
  p_password text,
  p_name text,
  p_phone text DEFAULT NULL,
  p_agency_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_identity_id uuid := gen_random_uuid();
  v_clean_email text := lower(trim(p_email));
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' OR p_password IS NULL OR trim(p_password) = '' THEN
    RAISE EXCEPTION 'البريد الإلكتروني وكلمة المرور مطلوبان';
  END IF;

  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_clean_email;

  IF v_user_id IS NOT NULL THEN
    -- Update existing user password
    UPDATE auth.users
    SET encrypted_password = crypt(p_password, gen_salt('bf')),
        email_confirmed_at = now(),
        raw_user_meta_data = jsonb_build_object('full_name', p_name, 'role', 'recruiter', 'user_type', 'agency'),
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    v_user_id := gen_random_uuid();
    -- Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_clean_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', p_name, 'role', 'recruiter', 'user_type', 'agency', 'agency_id', p_agency_id),
      now(), now()
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, created_at, updated_at
    ) VALUES (
      v_identity_id, v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id, 'email', v_clean_email, 'email_verified', true),
      'email', now(), now()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Ensure profiles record
  INSERT INTO public.profiles (id, user_id, full_name, role, updated_at)
  VALUES (v_user_id, v_user_id, p_name, 'recruiter', now())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'recruiter', updated_at = now();

  -- Ensure user_roles record
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'recruiter')
  ON CONFLICT DO NOTHING;

  -- Link in agency_members
  IF p_agency_id IS NOT NULL THEN
    INSERT INTO public.agency_members (agency_id, user_id, member_role)
    VALUES (p_agency_id, v_user_id, 'owner')
    ON CONFLICT DO NOTHING;

    UPDATE public.agencies
    SET owner_user_id = v_user_id
    WHERE id = p_agency_id;
  END IF;

  -- Link in agency_assignments
  IF p_company_id IS NOT NULL AND p_agency_id IS NOT NULL THEN
    INSERT INTO public.agency_assignments (agency_id, company_id, scope, status)
    VALUES (p_agency_id, p_company_id, 'company', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_clean_email
  );
END;
$$;

-- Grant execution to authenticated & anon roles
GRANT EXECUTE ON FUNCTION public.create_agency_account(text, text, text, text, uuid, uuid) TO authenticated, anon;
