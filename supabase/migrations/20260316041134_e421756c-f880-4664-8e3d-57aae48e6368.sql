
CREATE TABLE public.hiring_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hire_target integer NOT NULL DEFAULT 10,
  candidates_target integer NOT NULL DEFAULT 50,
  interviews_target integer NOT NULL DEFAULT 20,
  offers_target integer NOT NULL DEFAULT 8,
  month text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.hiring_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hiring goals"
ON public.hiring_goals
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_hiring_goals_updated_at
  BEFORE UPDATE ON public.hiring_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
