-- ============================================================
-- PASSWORD POLICIES
-- ============================================================
CREATE TABLE public.password_policies (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  min_length integer NOT NULL DEFAULT 8,
  require_uppercase boolean NOT NULL DEFAULT true,
  require_lowercase boolean NOT NULL DEFAULT true,
  require_numbers boolean NOT NULL DEFAULT true,
  require_special boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read password policies so they can be enforced during auth/reset
CREATE POLICY "Allow public read of password policies" 
ON public.password_policies 
FOR SELECT 
USING (true);

-- Allow users/admins to manage their own password policies
CREATE POLICY "Allow users to manage own password policy" 
ON public.password_policies 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
