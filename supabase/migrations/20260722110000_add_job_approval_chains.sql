-- Add approval_chain column to public.jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS approval_chain text DEFAULT 'سلسلة موافقة قياسية (مدير الموارد البشرية)';

-- Set default approval_chain for existing jobs without one
UPDATE public.jobs
SET approval_chain = 'سلسلة موافقة قياسية (مدير الموارد البشرية)'
WHERE approval_chain IS NULL;

-- Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
