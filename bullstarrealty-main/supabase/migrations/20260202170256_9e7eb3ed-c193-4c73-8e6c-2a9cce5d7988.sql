-- Create function to auto-set lead country from assignee
CREATE OR REPLACE FUNCTION public.set_lead_country_from_assignee()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a lead is assigned, set its country from the assignee's profile
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    SELECT country INTO NEW.country
    FROM public.profiles
    WHERE user_id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$;

-- Create helper function to get user's country
CREATE OR REPLACE FUNCTION public.get_user_country(_user_id uuid)
RETURNS public.country_code
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT country FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create trigger to auto-set country
DROP TRIGGER IF EXISTS set_lead_country_trigger ON public.leads;
CREATE TRIGGER set_lead_country_trigger
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_lead_country_from_assignee();