-- Legacy notes are not an authority for assigning a branch to a tenant.
-- Stop for targeted review instead of moving companies automatically.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  legacy_company record;
  parsed_notes jsonb;
BEGIN
  FOR legacy_company IN
    SELECT notes, parent_company_id
    FROM public.companies
    WHERE notes IS NOT NULL AND ltrim(notes) LIKE '{%'
  LOOP
    BEGIN
      parsed_notes := legacy_company.notes::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Legacy branch notes contain invalid JSON; targeted review is required before migration';
    END;

    IF legacy_company.parent_company_id IS NULL
       AND parsed_notes ->> 'parent_company_id' IS NOT NULL THEN
      RAISE EXCEPTION 'Legacy branch parent metadata requires targeted review; no company links were changed';
    END IF;
  END LOOP;
END;
$$;
