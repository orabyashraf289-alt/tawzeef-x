-- 1. Search History Table
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  result_count INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_user_created ON public.search_history(user_id, created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own search history"
ON public.search_history FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Saved Filters Table
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'candidates',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_filters_user ON public.saved_filters(user_id, scope);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved filters"
ON public.saved_filters FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_saved_filters_updated_at
BEFORE UPDATE ON public.saved_filters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Add QR code URL column to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qr_code_url TEXT;