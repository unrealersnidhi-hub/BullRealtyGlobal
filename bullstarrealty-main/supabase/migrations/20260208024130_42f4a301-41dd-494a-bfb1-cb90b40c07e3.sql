
-- Fix: Add manager role to leads SELECT policy
DROP POLICY IF EXISTS "Users can view leads based on role and country" ON public.leads;

CREATE POLICY "Users can view leads based on role and country" 
ON public.leads 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR (has_role(auth.uid(), 'admin'::app_role) AND ((country = get_user_country(auth.uid())) OR (country IS NULL) OR (get_user_country(auth.uid()) IS NULL))) 
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'mis'::app_role) 
  OR has_role(auth.uid(), 'telesales'::app_role) 
  OR (assigned_to = auth.uid())
);

-- Create lead_assignment_history table
CREATE TABLE public.lead_assignment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_from UUID,
  assigned_to UUID,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Block anonymous access to lead_assignment_history" 
ON public.lead_assignment_history 
FOR SELECT 
USING (false);

CREATE POLICY "Authenticated users can view assignment history" 
ON public.lead_assignment_history 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'mis'::app_role)
  OR has_role(auth.uid(), 'telesales'::app_role)
  OR (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_assignment_history.lead_id AND leads.assigned_to = auth.uid()))
);

CREATE POLICY "Authenticated users can insert assignment history" 
ON public.lead_assignment_history 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'telesales'::app_role)
);

-- Create trigger to auto-log assignment changes
CREATE OR REPLACE FUNCTION public.log_lead_assignment_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.lead_assignment_history (lead_id, assigned_from, assigned_to, assigned_by)
    VALUES (NEW.id, OLD.assigned_to, NEW.assigned_to, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_lead_assignment_history
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_assignment_history();
