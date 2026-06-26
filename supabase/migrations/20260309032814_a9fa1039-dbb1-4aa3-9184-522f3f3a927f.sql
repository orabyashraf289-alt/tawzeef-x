
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
