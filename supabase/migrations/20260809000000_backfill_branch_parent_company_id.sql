-- =========================================================================
-- BACKFILL: Fix existing branch rows where parent_company_id was stored
--           only in notes JSON instead of the real column.
--           This migration repairs branches created before the bug was fixed.
-- =========================================================================

-- Backfill parent_company_id column from notes JSON for existing branches
UPDATE public.companies
SET parent_company_id = (notes::jsonb->>'parent_company_id')::uuid
WHERE
  parent_company_id IS NULL
  AND notes IS NOT NULL
  AND notes LIKE '{%'
  AND notes::jsonb ? 'parent_company_id'
  AND (notes::jsonb->>'parent_company_id') IS NOT NULL
  AND (notes::jsonb->>'parent_company_id') ~ '^[0-9a-f-]{36}$';

-- Verify the fix
DO $$
DECLARE
  fixed_count INT;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.companies
  WHERE parent_company_id IS NOT NULL;
  RAISE NOTICE 'Companies with parent_company_id set: %', fixed_count;
END $$;
