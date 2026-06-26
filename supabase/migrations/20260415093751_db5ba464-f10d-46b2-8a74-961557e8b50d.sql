
CREATE TABLE public.roadmap_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  UNIQUE(user_id, task_key)
);

ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roadmap tasks"
  ON public.roadmap_tasks
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
