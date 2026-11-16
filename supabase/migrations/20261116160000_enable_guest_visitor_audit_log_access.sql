-- Migration: Enable Guest Visitor Tracking, RLS Visibility, and Direct RPC Logging
-- Description: Ensures unauthenticated visitors are recorded and visible to platform staff

-- 1) Allow authenticated staff to view unauthenticated guest visitor records in audit_log
DROP POLICY IF EXISTS "Authenticated users view guest visitor audit logs" ON public.audit_log;
CREATE POLICY "Authenticated users view guest visitor audit logs" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    event_type IN ('visitor.entry', 'visitor.page_view', 'guest.visit')
    OR (details->>'is_guest')::boolean = true
    OR details ? 'visitor_id'
  );

-- 2) Provide a secure RPC function to fetch guest visitor logs safely
CREATE OR REPLACE FUNCTION public.get_guest_visitor_logs(limit_count int DEFAULT 300)
RETURNS SETOF public.audit_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.audit_log
  WHERE event_type IN ('visitor.entry', 'visitor.page_view', 'guest.visit')
     OR (details->>'is_guest')::boolean = true
     OR details ? 'visitor_id'
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_visitor_logs(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_visitor_logs(int) TO authenticated;

-- 3) Provide a secure direct RPC for recording guest visitor events
-- Accessible to anon and authenticated callers for resilient tracking
CREATE OR REPLACE FUNCTION public.log_guest_visit_event(
  p_event_type text,
  p_details jsonb,
  p_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_company_id uuid;
BEGIN
  -- Validate event type to prevent misuse
  IF p_event_type NOT IN ('visitor.entry', 'visitor.page_view', 'guest.visit') THEN
    RAISE EXCEPTION 'Invalid guest event type: %', p_event_type;
  END IF;

  -- Attempt to extract or fallback company_id
  IF p_details ? 'company_id' AND (p_details->>'company_id') ~ '^[0-9a-fA-F-]{36}$' THEN
    v_company_id := (p_details->>'company_id')::uuid;
  ELSE
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
  END IF;

  INSERT INTO public.audit_log (
    event_type,
    user_id,
    user_email,
    company_id,
    ip_address,
    details
  ) VALUES (
    p_event_type,
    NULL,
    NULL,
    v_company_id,
    COALESCE(p_ip, 'visitor'),
    p_details
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_guest_visit_event(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_guest_visit_event(text, jsonb, text) TO anon, authenticated;
