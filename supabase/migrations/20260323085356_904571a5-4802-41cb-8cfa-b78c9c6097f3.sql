
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO public
USING (has_role(auth.uid(), 'admin'::app_role));
