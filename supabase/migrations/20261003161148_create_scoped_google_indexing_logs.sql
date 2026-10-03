-- Indexing submissions are written by the server and read within the job tenant.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.jobs ADD CONSTRAINT jobs_company_id_id_key UNIQUE (company_id, id);

CREATE TABLE public.google_indexing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id uuid,
  url text NOT NULL,
  action text NOT NULL CHECK (action IN ('URL_UPDATED', 'URL_DELETED')),
  status text NOT NULL,
  status_code integer,
  response jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_indexing_logs_job_scope_fkey FOREIGN KEY (company_id, job_id)
    REFERENCES public.jobs(company_id, id) ON DELETE SET NULL,
  CONSTRAINT google_indexing_logs_job_scope_check CHECK (job_id IS NULL OR company_id IS NOT NULL)
);
CREATE INDEX google_indexing_logs_job_created_idx
  ON public.google_indexing_logs(job_id, created_at DESC);
CREATE INDEX google_indexing_logs_created_idx
  ON public.google_indexing_logs(created_at DESC);
CREATE INDEX google_indexing_logs_company_created_idx
  ON public.google_indexing_logs(company_id, created_at DESC);

ALTER TABLE public.google_indexing_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_indexing_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.google_indexing_logs TO authenticated;
GRANT ALL ON public.google_indexing_logs TO service_role;

-- Logs whose job was deleted remain available only to platform administrators.
CREATE POLICY "Company members view their job indexing logs"
  ON public.google_indexing_logs FOR SELECT TO authenticated
  USING (
    public.is_super_admin((SELECT auth.uid()))
    OR (job_id IS NOT NULL AND public.has_company_access(company_id))
  );
