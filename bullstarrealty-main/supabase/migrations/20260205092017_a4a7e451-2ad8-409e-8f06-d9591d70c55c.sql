-- Update RLS policies for leads table to allow telesales to view all leads
DROP POLICY IF EXISTS "Users can view leads based on role and country" ON public.leads;

CREATE POLICY "Users can view leads based on role and country" 
ON public.leads 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  (has_role(auth.uid(), 'admin'::app_role) AND ((country = get_user_country(auth.uid())) OR (country IS NULL) OR (get_user_country(auth.uid()) IS NULL))) OR
  has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  (assigned_to = auth.uid())
);

-- Allow telesales to update leads (status, assignment)
DROP POLICY IF EXISTS "Managers can update leads" ON public.leads;

CREATE POLICY "Managers and telesales can update leads" 
ON public.leads 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  (assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  (assigned_to = auth.uid())
);

-- Allow telesales to insert call logs for any lead they can see
DROP POLICY IF EXISTS "Users can insert call logs for assigned leads" ON public.call_logs;

CREATE POLICY "Telesales and users can insert call logs" 
ON public.call_logs 
FOR INSERT 
WITH CHECK (
  (user_id = auth.uid()) AND (
    has_role(auth.uid(), 'telesales'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (SELECT 1 FROM leads WHERE leads.id = call_logs.lead_id AND leads.assigned_to = auth.uid())
  )
);

-- Allow telesales to view all call logs (for reporting)
DROP POLICY IF EXISTS "Users can view own call logs" ON public.call_logs;

CREATE POLICY "Users can view call logs" 
ON public.call_logs 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role)
);

-- Update lead_activities policies for telesales
DROP POLICY IF EXISTS "Users can view activities for assigned leads" ON public.lead_activities;

CREATE POLICY "Users can view lead activities" 
ON public.lead_activities 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_activities.lead_id AND leads.assigned_to = auth.uid())
);

-- Allow telesales to insert activities
DROP POLICY IF EXISTS "Users can insert activities for assigned leads" ON public.lead_activities;

CREATE POLICY "Users can insert lead activities" 
ON public.lead_activities 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_activities.lead_id AND leads.assigned_to = auth.uid())
);

-- Update lead_notes policies for telesales
DROP POLICY IF EXISTS "Users can manage notes for assigned leads" ON public.lead_notes;

CREATE POLICY "Users can manage lead notes" 
ON public.lead_notes 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND leads.assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_notes.lead_id AND leads.assigned_to = auth.uid())
);

-- Update profiles policy to let telesales view team profiles for assignment
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;

CREATE POLICY "Staff can view team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role)
);

-- Update follow_ups policy for telesales
DROP POLICY IF EXISTS "Users can manage follow_ups for assigned leads" ON public.follow_ups;

CREATE POLICY "Users can manage follow_ups" 
ON public.follow_ups 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = follow_ups.lead_id AND leads.assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'telesales'::app_role) OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = follow_ups.lead_id AND leads.assigned_to = auth.uid())
);