-- Update RLS policies for leads to include country filtering
DROP POLICY IF EXISTS "Users can view assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads based on role and country" ON public.leads;

-- Create new policy: super_admin sees all, admin sees their country, users see their assigned leads
CREATE POLICY "Users can view leads based on role and country"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND (country = get_user_country(auth.uid()) OR country IS NULL OR get_user_country(auth.uid()) IS NULL))
  OR (assigned_to = auth.uid())
);

DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads based on role and country" ON public.leads;
CREATE POLICY "Admins can update leads based on role and country"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND (country = get_user_country(auth.uid()) OR country IS NULL OR get_user_country(auth.uid()) IS NULL))
);

DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads based on role and country" ON public.leads;
CREATE POLICY "Admins can delete leads based on role and country"
ON public.leads
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND (country = get_user_country(auth.uid()) OR country IS NULL OR get_user_country(auth.uid()) IS NULL))
);

-- Update profiles policies
DROP POLICY IF EXISTS "Admins can view profiles based on role" ON public.profiles;
CREATE POLICY "Admins can view profiles based on role"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND (country = get_user_country(auth.uid()) OR country IS NULL OR get_user_country(auth.uid()) IS NULL))
);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND (country = get_user_country(auth.uid()) OR country IS NULL))
);

-- Update follow_ups policies
DROP POLICY IF EXISTS "Admins can manage all follow_ups" ON public.follow_ups;
CREATE POLICY "Admins can manage all follow_ups"
ON public.follow_ups
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update lead_notes policies
DROP POLICY IF EXISTS "Admins can manage all lead_notes" ON public.lead_notes;
CREATE POLICY "Admins can manage all lead_notes"
ON public.lead_notes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update lead_activities policies
DROP POLICY IF EXISTS "Admins can manage all activities" ON public.lead_activities;
CREATE POLICY "Admins can manage all activities"
ON public.lead_activities
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));