-- 1. Drop the dangerous policy that allows self-service admin signup
DROP POLICY IF EXISTS "Users can insert own admin role on signup" ON public.user_roles;

-- 2. Create secure admin-only role assignment policy
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));