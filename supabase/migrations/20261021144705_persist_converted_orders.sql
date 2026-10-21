-- Employment orders are private tenant records, not browser-local drafts.
ALTER TABLE public.job_offers ADD CONSTRAINT job_offers_company_id_id_unique UNIQUE (company_id, id);
CREATE TABLE public.converted_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_by text,
  offer_id uuid UNIQUE,
  candidate_id uuid,
  candidate_name text NOT NULL,
  candidate_email text,
  candidate_phone text,
  candidate_national_id text,
  candidate_nationality text,
  job_id uuid,
  job_title text NOT NULL,
  department text,
  company_name text,
  source_branch text,
  target_branch text,
  agency_id uuid,
  agency_name text,
  agency_quota integer NOT NULL DEFAULT 1 CHECK (agency_quota > 0),
  agency_fulfilled_count integer NOT NULL DEFAULT 0 CHECK (agency_fulfilled_count >= 0),
  order_type text NOT NULL CHECK (order_type IN ('direct_hire','agency_fulfillment','branch_transfer')),
  status text NOT NULL DEFAULT 'pending_documents' CHECK (status IN
    ('draft','pending_documents','contract_issued','visa_processing','medical_check',
     'ready_for_work','completed','cancelled')),
  basic_salary numeric NOT NULL DEFAULT 0 CHECK (basic_salary >= 0),
  housing_allowance numeric NOT NULL DEFAULT 0 CHECK (housing_allowance >= 0),
  transport_allowance numeric NOT NULL DEFAULT 0 CHECK (transport_allowance >= 0),
  other_allowances numeric NOT NULL DEFAULT 0 CHECK (other_allowances >= 0),
  total_salary numeric GENERATED ALWAYS AS
    (basic_salary + housing_allowance + transport_allowance + other_allowances) STORED,
  currency text NOT NULL DEFAULT 'SAR',
  joining_date date,
  contract_period_months integer NOT NULL DEFAULT 12 CHECK (contract_period_months > 0),
  probation_period_months integer NOT NULL DEFAULT 3 CHECK (probation_period_months >= 0),
  documents_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  transfer_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT converted_orders_company_number_key UNIQUE (company_id, order_number),
  CONSTRAINT converted_orders_company_candidate_fkey FOREIGN KEY (company_id, candidate_id)
    REFERENCES public.candidates(company_id, id),
  CONSTRAINT converted_orders_company_job_fkey FOREIGN KEY (company_id, job_id)
    REFERENCES public.jobs(company_id, id),
  CONSTRAINT converted_orders_company_offer_fkey FOREIGN KEY (company_id, offer_id)
    REFERENCES public.job_offers(company_id, id)
);

-- The offer must have been accepted, and the proposed order cannot swap its candidate or job.
CREATE FUNCTION public.guard_converted_order()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE linked public.job_offers%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.id, NEW.company_id, NEW.offer_id, NEW.candidate_id,
      NEW.job_id, NEW.created_by_user_id, NEW.order_number)
      IS DISTINCT FROM (OLD.id, OLD.company_id, OLD.offer_id, OLD.candidate_id,
      OLD.job_id, OLD.created_by_user_id, OLD.order_number) THEN
    RAISE EXCEPTION 'Order identity and tenant cannot be changed';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.order_number := 'ORD-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 12));
  END IF;
  IF TG_OP = 'INSERT' AND NEW.offer_id IS NOT NULL THEN
    SELECT * INTO linked FROM public.job_offers WHERE id = NEW.offer_id AND company_id = NEW.company_id;
    IF NOT FOUND OR linked.status <> 'accepted' OR NEW.candidate_id IS DISTINCT FROM linked.candidate_id
       OR NEW.job_id IS DISTINCT FROM linked.job_id OR NEW.order_type <> 'direct_hire' THEN
      RAISE EXCEPTION 'An accepted offer with the same candidate and job is required';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_converted_order() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_converted_order_before_write BEFORE INSERT OR UPDATE ON public.converted_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_converted_order();
CREATE INDEX converted_orders_company_created_idx ON public.converted_orders(company_id, created_at DESC);
CREATE INDEX converted_orders_company_candidate_idx ON public.converted_orders(company_id, candidate_id);

CREATE FUNCTION public.can_manage_converted_order(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND public.is_company_owner(_company_id)
    AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = _company_id
      AND c.status = 'active' AND (c.parent_company_id IS NULL OR EXISTS (
        SELECT 1 FROM public.companies p WHERE p.id = c.parent_company_id AND p.status = 'active')));
$$;
REVOKE ALL ON FUNCTION public.can_manage_converted_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_converted_order(uuid) TO authenticated;

ALTER TABLE public.converted_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read company employment orders" ON public.converted_orders
  FOR SELECT TO authenticated USING (public.can_manage_converted_order(company_id));
CREATE POLICY "Owners create company employment orders" ON public.converted_orders
  FOR INSERT TO authenticated WITH CHECK (
    created_by_user_id = (select auth.uid()) AND public.can_manage_converted_order(company_id));
CREATE POLICY "Owners update company employment orders" ON public.converted_orders
  FOR UPDATE TO authenticated USING (public.can_manage_converted_order(company_id))
  WITH CHECK (public.can_manage_converted_order(company_id));
CREATE POLICY "Owners remove company employment orders" ON public.converted_orders
  FOR DELETE TO authenticated USING (public.can_manage_converted_order(company_id));
REVOKE ALL ON public.converted_orders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.converted_orders TO authenticated;
