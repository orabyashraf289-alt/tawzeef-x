-- Resume archive notes & tags table
CREATE TABLE public.resume_archive_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_url text NOT NULL,
  candidate_email text,
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resume_url, candidate_email)
);

CREATE INDEX idx_resume_archive_meta_user ON public.resume_archive_meta(user_id);
CREATE INDEX idx_resume_archive_meta_tags ON public.resume_archive_meta USING GIN(tags);

ALTER TABLE public.resume_archive_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own archive meta"
ON public.resume_archive_meta FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_resume_archive_meta_updated_at
BEFORE UPDATE ON public.resume_archive_meta
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for live archive updates
ALTER TABLE public.candidates REPLICA IDENTITY FULL;
ALTER TABLE public.applications REPLICA IDENTITY FULL;
ALTER TABLE public.resume_archive_meta REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.resume_archive_meta;