-- Migration: Create google_indexing_logs table to track Google Indexing API submissions
-- Safe execution with idempotent IF NOT EXISTS checks

CREATE TABLE IF NOT EXISTS public.google_indexing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('URL_UPDATED', 'URL_DELETED')),
    status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'NOT_CONFIGURED', etc.
    status_code INTEGER,
    response JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for rapid querying and audit reports
CREATE INDEX IF NOT EXISTS idx_google_indexing_logs_job_id ON public.google_indexing_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_google_indexing_logs_action ON public.google_indexing_logs(action);
CREATE INDEX IF NOT EXISTS idx_google_indexing_logs_created_at ON public.google_indexing_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.google_indexing_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated recruiters/admins to view indexing logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'google_indexing_logs' 
        AND policyname = 'Authenticated users can view indexing logs'
    ) THEN
        CREATE POLICY "Authenticated users can view indexing logs"
            ON public.google_indexing_logs
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Allow server and service roles to insert indexing logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'google_indexing_logs' 
        AND policyname = 'Allow insert indexing logs'
    ) THEN
        CREATE POLICY "Allow insert indexing logs"
            ON public.google_indexing_logs
            FOR INSERT
            TO authenticated, anon, service_role
            WITH CHECK (true);
    END IF;
END $$;
