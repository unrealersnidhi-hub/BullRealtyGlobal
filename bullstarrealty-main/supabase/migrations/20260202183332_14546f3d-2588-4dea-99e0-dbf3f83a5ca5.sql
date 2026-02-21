-- Drop existing SELECT policy on user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Recreate with proper TO authenticated clause
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);