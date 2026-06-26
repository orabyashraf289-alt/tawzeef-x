
-- Job Offers table for managing employment offers
CREATE TABLE public.job_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  
  -- Offer details
  position text NOT NULL,
  department text,
  salary numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  start_date date,
  offer_type text NOT NULL DEFAULT 'full-time', -- full-time, part-time, contract
  benefits text[],
  additional_terms text,
  
  -- Tracking
  status text NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired, withdrawn
  token text NOT NULL DEFAULT upper(substr(md5(random()::text || gen_random_uuid()::text), 1, 16)),
  
  -- Candidate response
  response_date timestamp with time zone,
  response_notes text,
  signature_url text,
  
  -- Expiry
  expires_at timestamp with time zone,
  
  -- Timestamps
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own offers
CREATE POLICY "Users can manage own offers"
ON public.job_offers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update timestamp trigger
CREATE TRIGGER on_job_offers_updated
BEFORE UPDATE ON public.job_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Webhook trigger for offer status changes
CREATE OR REPLACE FUNCTION public.dispatch_offer_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'offer.status_changed',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'offer_id', NEW.id,
          'position', NEW.position,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'candidate_id', NEW.candidate_id
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_offer_status_change
AFTER UPDATE ON public.job_offers
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_offer_webhook();
