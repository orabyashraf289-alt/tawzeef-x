-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_en text,
  description text,
  description_en text,
  assignee text NOT NULL,
  assignee_en text,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  column_status text NOT NULL DEFAULT 'todo',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
CREATE POLICY "Users can manage their own tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_status ON public.tasks(column_status);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- Performance Evaluations Table
CREATE TABLE IF NOT EXISTS public.performance_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evalee_name text NOT NULL,
  evalee_name_en text,
  evalee_role text NOT NULL,
  evalee_role_en text,
  reviewer_name text NOT NULL,
  reviewer_name_en text,
  relationship text NOT NULL,
  productivity numeric NOT NULL,
  leadership numeric NOT NULL,
  teamwork numeric NOT NULL,
  technical numeric NOT NULL,
  communication numeric NOT NULL,
  comment text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_evaluations TO authenticated;
GRANT ALL ON public.performance_evaluations TO service_role;

ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own evaluations" ON public.performance_evaluations;
CREATE POLICY "Users can manage their own evaluations" ON public.performance_evaluations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_perf_eval_user_id ON public.performance_evaluations(user_id);

DROP TRIGGER IF EXISTS trg_performance_evaluations_updated_at ON public.performance_evaluations;
CREATE TRIGGER trg_performance_evaluations_updated_at
  BEFORE UPDATE ON public.performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
