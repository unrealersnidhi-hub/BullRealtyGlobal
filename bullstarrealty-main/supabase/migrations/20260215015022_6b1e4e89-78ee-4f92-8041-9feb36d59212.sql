
-- Remove telesales from leads SELECT policy
DROP POLICY IF EXISTS "Users can view leads based on role and country" ON public.leads;
CREATE POLICY "Users can view leads based on role and country"
ON public.leads FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'admin'::app_role) AND ((country = get_user_country(auth.uid())) OR (country IS NULL) OR (get_user_country(auth.uid()) IS NULL))) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'mis'::app_role) OR
  (assigned_to = auth.uid())
);

-- Remove telesales from leads UPDATE policy
DROP POLICY IF EXISTS "Managers and telesales can update leads" ON public.leads;
CREATE POLICY "Managers can update leads"
ON public.leads FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (assigned_to = auth.uid())
);
