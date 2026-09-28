-- Migration to enhance tasks table with candidate_id, job_id, subtasks, tags, and comments
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;

-- Create indexes for quick candidate and job task lookups
CREATE INDEX IF NOT EXISTS idx_tasks_candidate_id ON public.tasks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON public.tasks(job_id);
