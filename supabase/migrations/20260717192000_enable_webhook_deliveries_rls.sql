-- Enable Row Level Security (RLS) on webhook_deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflict
DROP POLICY IF EXISTS "Users view own webhook deliveries" ON public.webhook_deliveries;
DROP POLICY IF EXISTS "Service can insert webhook deliveries" ON public.webhook_deliveries;

-- Allow users to view their own webhook deliveries
CREATE POLICY "Users view own webhook deliveries" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users/services to insert webhook deliveries for their own user_id
CREATE POLICY "Service can insert webhook deliveries" ON public.webhook_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
