
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
