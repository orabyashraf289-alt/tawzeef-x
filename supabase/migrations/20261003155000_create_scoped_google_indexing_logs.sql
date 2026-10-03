-- Indexing submissions are written by the server and read within the job tenant.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.google_indexing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  url text NOT NULL,
  action text NOT NULL CHECK (action IN ('URL_UPDATED', 'URL_DELETED')),
  status text NOT NULL,
  status_code integer,
  response jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX google_indexing_logs_job_created_idx
  ON public.google_indexing_logs(job_id, created_at DESC);
CREATE INDEX google_indexing_logs_created_idx
  ON public.google_indexing_logs(created_at DESC);

ALTER TABLE public.google_indexing_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_indexing_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.google_indexing_logs TO authenticated;
GRANT ALL ON public.google_indexing_logs TO service_role;

-- Logs whose job was deleted remain available only to platform administrators.
CREATE POLICY "Company members view their job indexing logs"
  ON public.google_indexing_logs FOR SELECT TO authenticated
  USING (
    public.is_super_admin((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.jobs job
      WHERE job.id = google_indexing_logs.job_id
        AND public.has_company_access(job.company_id)
    )
  );
