-- Add assigned_to column to leads table
ALTER TABLE public.leads 
ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;

-- Create new SELECT policy: Admins see all, users see only their assigned leads
CREATE POLICY "Users can view assigned leads" 
ON public.leads 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR assigned_to = auth.uid()
);

-- Create index for faster queries on assigned_to
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);