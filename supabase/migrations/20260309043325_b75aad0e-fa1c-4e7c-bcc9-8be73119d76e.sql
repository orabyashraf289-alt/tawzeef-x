
-- Allow public access to offers via token (for candidate portal)
CREATE POLICY "Public can view offers by token"
ON public.job_offers
FOR SELECT
USING (true);

-- Allow public to update offer status via token (accept/reject)
CREATE POLICY "Public can respond to offers"
ON public.job_offers
FOR UPDATE
USING (status IN ('sent', 'viewed'))
WITH CHECK (status IN ('viewed', 'accepted', 'rejected'));
