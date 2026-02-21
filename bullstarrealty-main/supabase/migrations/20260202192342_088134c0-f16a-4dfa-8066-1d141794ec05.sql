-- Add RLS policy for managers to update leads (assign to their team)
CREATE POLICY "Managers can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add RLS policy for managers to view user_roles (to list team members)
CREATE POLICY "Managers can view team roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add RLS policy for managers to view profiles (to list team members)
CREATE POLICY "Managers can view team profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);