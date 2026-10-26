-- Disposable migration replay database only; synthetic users and edits roll back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('45000000-0000-0000-0000-000000000001', 'contact-admin@example.test', '{}'),
 ('45000000-0000-0000-0000-000000000002', 'contact-tenant@example.test', '{"role":"super_admin"}');
SET LOCAL session_replication_role = origin;
INSERT INTO public.platform_roles (user_id, role) VALUES ('45000000-0000-0000-0000-000000000001', 'super_admin');
INSERT INTO public.user_roles (user_id, role) VALUES ('45000000-0000-0000-0000-000000000002', 'admin');
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT contact_email FROM public.platform_contact_settings) <> 'tawzeefx@outlook.com'
 OR (SELECT contact_phone FROM public.platform_contact_settings) <> '' THEN
   RAISE EXCEPTION 'Public contact defaults are incorrect';
 END IF;
 BEGIN
   UPDATE public.platform_contact_settings SET contact_email = 'attacker@example.test';
   RAISE EXCEPTION 'Anonymous edit allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '45000000-0000-0000-0000-000000000002', true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE changed integer; BEGIN
 UPDATE public.platform_contact_settings SET contact_email = 'tenant@example.test';
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> 0 THEN RAISE EXCEPTION 'Tenant admin changed global contact settings'; END IF;
 BEGIN
   DELETE FROM public.platform_contact_settings;
   RAISE EXCEPTION 'Client can delete singleton';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub', '45000000-0000-0000-0000-000000000001', true);
DO $$ DECLARE changed integer; BEGIN
 UPDATE public.platform_contact_settings SET contact_email = 'contact@example.test', support_email = 'help@example.test', contact_phone = '+966 50 123 4567';
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed <> 1 THEN RAISE EXCEPTION 'Platform super admin cannot save'; END IF;
 BEGIN
   UPDATE public.platform_contact_settings SET support_email = 'bad@example.test?subject=injected';
   RAISE EXCEPTION 'Malformed email accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   UPDATE public.platform_contact_settings SET contact_phone = 'javascript:alert(1)';
   RAISE EXCEPTION 'Malformed phone accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   INSERT INTO public.platform_contact_settings (id, contact_email, support_email) VALUES (false, 'test@example.test', 'test@example.test');
   RAISE EXCEPTION 'Client can insert singleton';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT support_email FROM public.platform_contact_settings) <> 'help@example.test' THEN
   RAISE EXCEPTION 'Saved contact details are not public';
 END IF;
END $$;
ROLLBACK;
