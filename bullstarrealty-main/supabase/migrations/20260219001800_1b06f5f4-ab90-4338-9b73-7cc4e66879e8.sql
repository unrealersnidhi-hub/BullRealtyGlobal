
-- 1. Team Availability (simple toggle for leave/available)
CREATE TABLE public.team_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_available boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.team_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage team availability"
ON public.team_availability FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role));

CREATE POLICY "Users can view own availability"
ON public.team_availability FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Block anonymous team_availability"
ON public.team_availability FOR ALL
USING (false) WITH CHECK (false);

-- 2. Sales Targets
CREATE TABLE public.sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL, -- 'revenue', 'conversions', 'calls'
  target_value numeric NOT NULL DEFAULT 0,
  achieved_value numeric NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
  month integer NOT NULL,
  year integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(user_id, target_type, period, month, year)
);

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales targets"
ON public.sales_targets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Everyone can view sales targets"
ON public.sales_targets FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'mis'::app_role) OR has_role(auth.uid(), 'telesales'::app_role) OR auth.uid() = user_id);

CREATE POLICY "Block anonymous sales_targets"
ON public.sales_targets FOR ALL
USING (false) WITH CHECK (false);

-- 3. Duplicate lead merge function (phone AND email match)
CREATE OR REPLACE FUNCTION public.merge_duplicate_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_lead_id uuid;
  existing_lead record;
BEGIN
  -- Check for existing lead with same phone AND email (both must match)
  IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    SELECT id INTO existing_lead_id
    FROM public.leads
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      AND phone IS NOT NULL
      AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g'), 10)
    LIMIT 1;

    IF existing_lead_id IS NOT NULL THEN
      -- Update existing lead with new source info
      UPDATE public.leads
      SET 
        message = COALESCE(NEW.message, message),
        interest = COALESCE(NEW.interest, interest),
        updated_at = now()
      WHERE id = existing_lead_id;

      -- Log the merge as activity
      INSERT INTO public.lead_activities (
        lead_id, activity_type, title, description, metadata
      ) VALUES (
        existing_lead_id,
        'duplicate_merged',
        'Duplicate Lead Merged',
        'Duplicate entry from ' || COALESCE(NEW.source, 'unknown') || ' was merged into this lead.',
        jsonb_build_object(
          'merged_source', NEW.source,
          'merged_name', NEW.full_name,
          'merged_email', NEW.email,
          'merged_phone', NEW.phone,
          'merged_at', now()
        )
      );

      -- Skip inserting the duplicate
      RETURN NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_duplicate_lead
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.merge_duplicate_lead();

-- 4. Update trigger for sales_targets
CREATE TRIGGER update_sales_targets_updated_at
BEFORE UPDATE ON public.sales_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
